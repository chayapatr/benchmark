<script lang="ts">
	import type { Scenario } from '$lib/types';

	let {
		scenario,
		areaName,
		subId,
		areaId,
		onSelectScript,
		onRun
	}: {
		scenario: Scenario;
		areaName: string;
		subId: string;
		areaId: string;
		onSelectScript: (subId: string, areaId: string, scenarioId: string, scriptId: string) => void;
		onRun: () => void;
	} = $props();
</script>

<div class="flex flex-col h-full overflow-y-auto">
	<!-- header with run button -->
	<div class="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
		<div class="text-xs text-zinc-400">{areaName}</div>
		<button
			onclick={onRun}
			class="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700"
		>
			▶ run all scripts
		</button>
	</div>

	<div class="space-y-4 px-5 py-4">
		<input
			bind:value={scenario.name}
			class="w-full border-b border-zinc-200 bg-transparent pb-1 text-base font-semibold text-zinc-900 transition focus:border-zinc-500 focus:outline-none"
		/>
		<textarea
			bind:value={scenario.description}
			rows="2"
			class="w-full resize-none rounded border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-600 focus:border-zinc-500 focus:outline-none"
		></textarea>
		<div class="pt-2 text-xs text-zinc-400">scripts ({scenario.scripts.length})</div>
		{#each scenario.scripts as sc, idx (sc.id)}
			<button
				onclick={() => onSelectScript(subId, areaId, scenario.id, sc.id)}
				class="flex w-full items-center gap-3 py-1.5 text-left text-xs text-zinc-500 transition hover:text-zinc-800"
			>
				<span class="text-zinc-300">–</span> script {idx + 1}
				<span class="text-zinc-300">{sc.anchors.length} anchors</span>
			</button>
		{/each}
	</div>
</div>
