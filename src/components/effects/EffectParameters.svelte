<script lang="ts">
  import { Dices } from '@lucide/svelte';
  import type { EffectDefinition } from '../../lib/effects/core/types';
  import type { EffectInstance, LayerNode } from '../../lib/document/types';
  import { setEffectParameter, setEffectInput, finishEdit } from '../../lib/editor/store';
  import { randomSeed } from '../../lib/utils/random';
  let { definition, instance, layer, layers }: { definition: EffectDefinition; instance: EffectInstance; layer: LayerNode; layers: LayerNode[] } = $props();
</script>

<div class="effect-parameters">
  {#each definition.inputs as input (input.id)}
    <label class="effect-parameter"><span>{input.label}</span><select aria-label={input.label} value={instance.inputs[input.id] ?? ''} disabled={layer.locked} onchange={event => setEffectInput(layer.id, instance.id, input.id, event.currentTarget.value)}><option value="">Vyberte vrstvu…</option>{#each layers.filter(value => value.id !== layer.id) as value}<option value={value.id}>{value.name}</option>{/each}</select></label>
  {/each}
  {#each definition.parameters as parameter (parameter.id)}
    <div class="effect-parameter">
      <label for={`parameter-${instance.id}-${parameter.id}`}>{parameter.label}</label>
      {#if parameter.type === 'boolean'}
        <input id={`parameter-${instance.id}-${parameter.id}`} type="checkbox" checked={Boolean(instance.parameters[parameter.id])} disabled={layer.locked} onchange={event => setEffectParameter(layer.id, instance.id, parameter.id, event.currentTarget.checked)}/>
      {:else if parameter.type === 'select'}
        <select id={`parameter-${instance.id}-${parameter.id}`} value={String(instance.parameters[parameter.id])} disabled={layer.locked} onchange={event => setEffectParameter(layer.id, instance.id, parameter.id, event.currentTarget.value)}>{#each parameter.options ?? [] as option}<option value={option.value}>{option.label}</option>{/each}</select>
      {:else if parameter.type === 'color'}
        <input id={`parameter-${instance.id}-${parameter.id}`} type="color" value={String(instance.parameters[parameter.id])} disabled={layer.locked} oninput={event => setEffectParameter(layer.id, instance.id, parameter.id, event.currentTarget.value)}/>
      {:else if parameter.type === 'layer'}
        <select id={`parameter-${instance.id}-${parameter.id}`} value={String(instance.parameters[parameter.id] ?? '')} disabled={layer.locked} onchange={event => setEffectParameter(layer.id, instance.id, parameter.id, event.currentTarget.value)}><option value="">Žádná</option>{#each layers.filter(value => value.id !== layer.id) as value}<option value={value.id}>{value.name}</option>{/each}</select>
      {:else if parameter.type === 'seed'}
        <div class="seed-input"><input id={`parameter-${instance.id}-${parameter.id}`} type="number" min={parameter.min} max={parameter.max} step="1" value={Number(instance.parameters[parameter.id])} disabled={layer.locked} onchange={event => setEffectParameter(layer.id, instance.id, parameter.id, Number(event.currentTarget.value))}/><button class="icon-button" aria-label="Randomize seed" title="Randomize" disabled={layer.locked} onclick={() => setEffectParameter(layer.id, instance.id, parameter.id, randomSeed())}><Dices size={16}/></button></div>
      {:else}
        <div class="effect-number"><input id={`parameter-${instance.id}-${parameter.id}`} type="range" min={parameter.min} max={parameter.max} step={parameter.step ?? 0.01} value={Number(instance.parameters[parameter.id])} disabled={layer.locked} oninput={event => setEffectParameter(layer.id, instance.id, parameter.id, Number(event.currentTarget.value))} onchange={finishEdit}/><input type="number" aria-label={`${parameter.label} hodnota`} min={parameter.min} max={parameter.max} step={parameter.step ?? 0.01} value={Number(instance.parameters[parameter.id])} disabled={layer.locked} onchange={event => { setEffectParameter(layer.id, instance.id, parameter.id, Number(event.currentTarget.value)); finishEdit(); }}/></div>
      {/if}
    </div>
  {/each}
</div>
