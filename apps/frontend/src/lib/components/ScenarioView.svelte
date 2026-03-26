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

	function toggleValidate() {
		scenario.validated = !scenario.validated;
	}
</script>

<div class="flex flex-col h-full overflow-y-auto">
	<!-- header with run button -->
	<div class="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
		<div class="flex items-center gap-2 min-w-0">
			<span class="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 shrink-0">Scenario</span>
			<span class="text-xs text-zinc-400 truncate">{areaName}</span>
		</div>
		<div class="flex items-center gap-2">
			{#if scenario.validated}
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

	<div class="space-y-4 px-5 py-4">
		<!-- scenario name + description -->
		<div class="space-y-2">
			<input
				bind:value={scenario.name}
				class="w-full bg-transparent text-base font-semibold text-zinc-900 transition focus:outline-none"
			/>
			<textarea
				bind:value={scenario.description}
				rows="2"
				placeholder="Describe the test scenario, what the user is trying to achieve, and what risks to probe…"
				class="w-full resize-none rounded border border-zinc-100 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-500 placeholder:text-zinc-300 focus:border-zinc-300 focus:outline-none"
			></textarea>
		</div>

		<!-- review callout -->
		<button
			onclick={toggleValidate}
			class="w-full rounded-lg border px-4 py-3 text-left transition
			{scenario.validated
				? 'border-zinc-400 bg-zinc-50 hover:bg-zinc-100'
				: 'border-dashed border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'}"
		>
			<div class="flex items-center gap-3">
				<span class="text-xl leading-none {scenario.validated ? 'text-emerald-500' : 'text-zinc-300'}">{scenario.validated ? '✓' : '○'}</span>
				<div>
					<div class="text-sm font-semibold {scenario.validated ? 'text-zinc-800' : 'text-zinc-700'}">
						{scenario.validated ? 'Scenario approved' : 'Approve scenario'}
					</div>
					<p class="mt-0.5 text-xs {scenario.validated ? 'text-zinc-500' : 'text-zinc-400'}">
						{scenario.validated ? 'Description, user persona, and goal are confirmed correct.' : 'Confirm the description, user persona, and goal are accurate for this test case.'}
					</p>
				</div>
			</div>
		</button>

		<!-- scripts list -->
		<div class="space-y-1">
			<div class="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
				{scenario.scripts.length} script{scenario.scripts.length !== 1 ? 's' : ''}
			</div>
			{#each scenario.scripts as sc, idx (sc.id)}
				<button
					onclick={() => onSelectScript(subId, areaId, scenario.id, sc.id)}
					class="group flex w-full items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-left transition hover:border-zinc-300 hover:bg-white"
				>
					<div class="flex items-center gap-2.5">
						<span class="text-xs font-mono text-zinc-300">{idx + 1}</span>
						<span class="text-xs font-medium text-zinc-700 group-hover:text-zinc-900">script {idx + 1}</span>
					</div>
					<div class="flex items-center gap-2 shrink-0">
						{#if sc.validated}<span class="text-xs text-emerald-500">✓</span>{/if}
						<span class="text-xs text-zinc-400">{sc.anchors.length} anchor{sc.anchors.length !== 1 ? 's' : ''}</span>
						<span class="text-zinc-200 group-hover:text-zinc-400">›</span>
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>
