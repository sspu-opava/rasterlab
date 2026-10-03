import { effectRegistry } from '../effects';
import { validateParameters } from '../effects/core/parameters';
import type { EffectPreset } from './presets';
const recipes: [string, string, [string, Record<string, string | number | boolean>][]][] = [
  ['paper', 'Papírová koláž', [['random-tiles', {}], ['crumple', {}]]],
  ['toner', 'Tonerový tisk', [['grayscale', {}], ['photocopy', {}]]],
  ['ink', 'Rozpitý inkoust', [['threshold', {}], ['ink-bleed', {}]]],
  ['signal', 'Rozpad signálu', [['rgb-shift', {}], ['signal-collapse', {}]]],
  ['cells', 'Buněčná textura', [['cellular-growth', {}], ['surface-relief', {}]]],
  ['contours', 'Atlas vrstevnic', [['fbm-noise', {}], ['contour-atlas', {}]]],
  ['echo', 'Prostorová ozvěna', [['echo-frames', {}], ['paper-warp', {}]]],
  ['cuts', 'Rozstříhaný tisk', [['cut-up', {}], ['print-misregistration', {}]]],
  ['relief', 'Skládaný reliéf', [['fold-map', {}], ['surface-relief', {}]]],
  ['difference', 'Rozdíl dvou obrazů', [['quantized-difference', {}], ['contour-atlas', {}]]],
];
export const builtinPresets: EffectPreset[] = recipes.map(([id, name, recipe]) => {
  let needsSource = false;
  const effects = recipe.map(([effectId, parameters]) => {
    const definition = effectRegistry.get(effectId); if (!definition) throw new Error(`Neznámý efekt presetu: ${effectId}`);
    const inputs = Object.fromEntries(definition.inputs.map(input => { needsSource = true; return [input.id, 'source-1']; }));
    return { effectId, version: definition.version, enabled: true, parameters: validateParameters(definition, parameters), inputs };
  });
  return { format: 'rasterlab-preset', version: 1, id: `builtin-${id}`, name, effects, roles: needsSource ? [{ id: 'source-1', label: 'Druhý obraz' }] : [] };
});
