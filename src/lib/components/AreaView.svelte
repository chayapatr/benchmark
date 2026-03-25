<script lang="ts">
	import type { Area } from '$lib/types';

	let {
		area,
		subId,
		onSelectScenario,
		onRun
	}: {
		area: Area;
		subId: string;
		onSelectScenario: (subId: string, areaId: string, scenarioId: string) => void;
		onRun: () => void;
	} = $props();
</script>

<div class="flex flex-col h-full overflow-y-auto">
	<!-- header with run button -->
	<div class="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
		<div class="text-xs text-zinc-400">area</div>
		<button
			onclick={onRun}
			class="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
		>
			▶ run all scenarios
		</button>
	</div>

	<div class="space-y-4 px-5 py-4">
		<input
			bind:value={area.name}
			class="w-full border-b border-zinc-200 bg-transparent pb-1 text-base font-semibold text-zinc-900 transition focus:border-zinc-500 focus:outline-none"
		/>
		<div class="pt-2 text-xs text-zinc-400">scenarios ({area.scenarios.length})</div>
		{#each area.scenarios as sc (sc.id)}
			<button
				onclick={() => onSelectScenario(subId, area.id, sc.id)}
				class="flex w-full items-center gap-3 py-1.5 text-left text-xs text-zinc-500 transition hover:text-zinc-800"
			>
				<span class="text-zinc-300">▸</span>
				{sc.name}
				<span class="text-zinc-300">{sc.scripts.length} scripts</span>
			</button>
		{/each}
	</div>
</div>
