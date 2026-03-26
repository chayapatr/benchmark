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

	function toggleValidate() {
		area.validated = !area.validated;
	}
</script>

<div class="flex flex-col h-full overflow-y-auto">
	<!-- header with run button -->
	<div class="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
		<div class="flex items-center gap-2">
			<span class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Area</span>
			<span class="text-sm font-semibold text-zinc-800">{area.name}</span>
		</div>
		<div class="flex items-center gap-2">
			{#if area.validated}
				<span class="text-xs font-medium text-emerald-600">✓ reviewed</span>
			{/if}
			<button
				onclick={onRun}
				class="flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1 text-xs font-medium text-white transition hover:bg-zinc-700"
			>
				▶ run all
			</button>
		</div>
	</div>

	<div class="space-y-3 px-5 py-4">
		<!-- review callout -->
		<button
			onclick={toggleValidate}
			class="w-full rounded-lg border px-4 py-3 text-left transition
			{area.validated
				? 'border-zinc-400 bg-zinc-50 hover:bg-zinc-100'
				: 'border-dashed border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'}"
		>
			<div class="flex items-center gap-3">
				<span class="text-xl leading-none {area.validated ? 'text-emerald-500' : 'text-zinc-300'}">{area.validated ? '✓' : '○'}</span>
				<div>
					<div class="text-sm font-semibold {area.validated ? 'text-zinc-800' : 'text-zinc-700'}">
						{area.validated ? 'Area approved' : 'Approve area'}
					</div>
					<p class="mt-0.5 text-xs {area.validated ? 'text-zinc-500' : 'text-zinc-400'}">
						{area.validated ? 'Area name and all scenarios are confirmed correct.' : 'Confirm the area name and all its scenarios are accurate.'}
					</p>
				</div>
			</div>
		</button>

	</div><div class="space-y-1 px-5 py-0">
		<div class="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
			{area.scenarios.length} scenario{area.scenarios.length !== 1 ? 's' : ''}
		</div>
		{#each area.scenarios as sc, i (sc.id)}
			<button
				onclick={() => onSelectScenario(subId, area.id, sc.id)}
				class="group flex w-full items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
			>
				<div class="flex items-center gap-2.5 min-w-0">
					<span class="shrink-0 text-xs font-mono text-zinc-300">{i + 1}</span>
					<span class="truncate text-xs font-medium text-zinc-700 group-hover:text-zinc-900">{sc.name}</span>
				</div>
				<div class="flex items-center gap-2 shrink-0 ml-2">
					{#if sc.validated}<span class="text-xs text-emerald-500">✓</span>{/if}
					<span class="text-xs text-zinc-400">{sc.scripts.length} script{sc.scripts.length !== 1 ? 's' : ''}</span>
					<span class="text-zinc-200 group-hover:text-zinc-400">›</span>
				</div>
			</button>
		{/each}
	</div>
</div>
