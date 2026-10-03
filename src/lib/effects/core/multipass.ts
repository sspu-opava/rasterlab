import { Rectangle, RenderTexture, Sprite } from 'pixi.js';
import type { Renderer, Texture } from 'pixi.js';
import type { EffectDefinition, EffectRenderContext, ParameterValue } from './types';

/** Deterministic iteration: fresh initialization on each dirty evaluation, two reusable targets. */
export function multipassEffect(definition: Omit<EffectDefinition, 'createRenderer'>, stages: {
  initialize: EffectDefinition; step: EffectDefinition; finish: EffectDefinition;
  passes(parameters: Record<string, ParameterValue>): number;
}): EffectDefinition {
  return { ...definition, createRenderer(initialContext) {
    const initialize = stages.initialize.createRenderer(initialContext);
    const step = stages.step.createRenderer(initialContext);
    const finish = stages.finish.createRenderer(initialContext);
    if (!initialize.filter || !step.filter || !finish.filter) throw new Error('Vnořené multipass stage nejsou podporovány.');
    let context: EffectRenderContext = initialContext;
    let parameters: Record<string, ParameterValue> = {};
    let targets: [RenderTexture, RenderTexture] | undefined;
    const release = () => { targets?.forEach(target => target.destroy(true)); targets = undefined; };
    const draw = (input: Texture, output: RenderTexture, renderer: Renderer, filter: NonNullable<typeof step.filter>) => {
      const sprite = new Sprite(input); sprite.filterArea = new Rectangle(0, 0, context.width, context.height); sprite.filters = [filter];
      try { renderer.render({ container: sprite, target: output, clear: true }); }
      finally { sprite.filters = []; sprite.destroy(); }
    };
    return {
      update(next, nextContext) {
        if (nextContext.width !== context.width || nextContext.height !== context.height) release();
        parameters = next; context = nextContext;
      },
      render(input, output, renderer) {
        targets ??= [RenderTexture.create({ width: context.width, height: context.height, resolution: 1 }), RenderTexture.create({ width: context.width, height: context.height, resolution: 1 })];
        const next = { ...context, secondary: input };
        initialize.update(parameters, next); draw(input, targets[0], renderer, initialize.filter!);
        let index = 0;
        const count = Math.max(0, Math.min(256, Math.round(stages.passes(parameters))));
        for (let phase = 0; phase < count; phase++) {
          step.update({ ...parameters, phase }, next);
          draw(targets[index], targets[1 - index], renderer, step.filter!); index = 1 - index;
        }
        finish.update(parameters, next); draw(targets[index], output, renderer, finish.filter!);
      },
      destroy() { release(); initialize.destroy(); step.destroy(); finish.destroy(); },
    };
  } };
}
export const copyBody = 'finalColor = source;';
