<script lang="ts">
  import { Plus } from '@lucide/svelte';
  import { generatorRegistry } from '../../lib/generators';
  import { addGenerator, busy, importing } from '../../lib/editor/store';
</script>
<div class="presets-content generators-content">
  <p class="effect-description">Procedurální vrstvy bez importu bitmapy. Parametry upravíte ve vlastnostech vrstvy.</p>
  {#each generatorRegistry.list() as generator (generator.id)}<div class="preset-card"><strong>{generator.name}</strong><p class="effect-description">{generator.description}</p><button class="small-button" aria-label={`Přidat generátor ${generator.name}`} disabled={$busy || $importing} onclick={() => addGenerator(generator.id)}><Plus size={13}/>Přidat vrstvu</button></div>{/each}
</div>
