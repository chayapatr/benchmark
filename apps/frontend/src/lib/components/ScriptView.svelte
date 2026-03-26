<script lang="ts">
	import type { ActiveTab, AppState, Metric, Model, Run, Script } from '$lib/types';

	let {
		script,
		scenarioName,
		areaName,
		scriptNum,
		runs,
		metrics,
		allModels,
		app,
		onOpenChat,
		onRunScript
	}: {
		script: Script;
		scenarioName: string;
		areaName: string;
		scriptNum: number;
		runs: Run[];
		metrics: Metric[];
		allModels: Model[];
		app: AppState;
		onOpenChat: (runId: string) => void;
		onRunScript: (scriptId: string) => void;
	} = $props();

	const TABS: ActiveTab[] = ['anchors', 'runs', 'eval'];

	let sRuns = $derived(runs.filter((r) => r.scriptId === script.id));
	let doneRuns = $derived(sRuns.filter((r) => r.status === 'done'));

	// Group runs by (modelId, round) — latest version per group
	let latestRuns = $derived(() => {
		const map = new Map<string, Run>();
		for (const r of sRuns) {
			const key = `${r.modelId}-${r.round}`;
			const existing = map.get(key);
			if (!existing || r.version > existing.version) map.set(key, r);
		}
		return [...map.values()];
	});

	// All distinct versions for the history view
	let allVersions = $derived([...new Set(sRuns.map((r) => r.version))].sort((a, b) => a - b));

	function avgScore(run: Run, metricName: string): number {
		const judges = run.scores[metricName];
		if (!judges) return 0;
		const vals = Object.values(judges).map((j) => j.score);
		return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
	}

	function avgVariance(run: Run, metricName: string): number {
		return run.variance[metricName] ?? 0;
	}

	function scoreColor(v: number, variance: number) {
		if (variance > 0.08) return 'text-amber-600';
		if (v >= 0.85) return 'text-emerald-600';
		if (v >= 0.7) return 'text-sky-600';
		return 'text-red-500';
	}

	function addAnchor() {
		script.anchors.push({ id: crypto.randomUUID(), turn: '', instruction: '' });
	}
	function removeAnchor(anchorId: string) {
		script.anchors = script.anchors.filter((a) => a.id !== anchorId);
	}

	let showJudgeBreakdown = $state(false);
	let selectedVersion = $state<number | 'latest'>('latest');

	let displayedRuns = $derived(
		selectedVersion === 'latest'
			? latestRuns()
			: sRuns.filter((r) => r.version === selectedVersion && r.status === 'done')
	);

	let isRunning = $derived(sRuns.some((r) => r.status === 'running'));

	function toggleValidate() {
		script.validated = !script.validated;
	}
</script>

<!-- tab bar + run button -->
<div class="flex shrink-0 items-center justify-between border-b border-zinc-200 px-2 gap-2">
	<div class="flex">
		{#each TABS as tab (tab)}
			<button
				onclick={() => (app.activeTab = tab)}
				class="-mb-px border-b-2 px-3 py-2 text-xs transition
				{app.activeTab === tab
					? 'border-zinc-500 text-zinc-800'
					: 'border-transparent text-zinc-400 hover:text-zinc-600'}"
			>
				{tab.charAt(0).toUpperCase() + tab.slice(1)}
				{#if tab === 'runs' && sRuns.length > 0}
					<span class="ml-1 text-zinc-300">{doneRuns.length}/{sRuns.length}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- validate status + run button -->
	<div class="flex items-center gap-2 mr-1">
		{#if script.validated}
			<span class="text-xs text-emerald-600 font-medium">✓ reviewed</span>
		{/if}
		<button
			onclick={() => { onRunScript(script.id); app.activeTab = 'runs'; }}
			disabled={isRunning}
			class="flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium transition disabled:opacity-50
			{isRunning
				? 'bg-amber-50 text-amber-600'
				: doneRuns.length > 0
					? 'border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
					: 'bg-zinc-800 text-white hover:bg-zinc-700'}"
		>
			{#if isRunning}
				<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"></span>
				running…
			{:else if doneRuns.length > 0}
				▶ re-run
			{:else}
				▶ run
			{/if}
		</button>
	</div>
</div>

<div class="flex-1 overflow-y-auto px-5 py-4">
	{#if app.activeTab === 'anchors'}
		<div class="mb-4 flex items-center gap-1 text-xs">
		<span class="text-zinc-400">{areaName}</span>
		<span class="text-zinc-200">›</span>
		<span class="text-zinc-400">{scenarioName}</span>
		<span class="text-zinc-200">›</span>
		<span class="font-medium text-zinc-500">script {scriptNum}</span>
	</div>
		<div class="space-y-1">
			{#if script.anchors.length === 0}
				<p class="mb-3 text-xs text-zinc-400">Add turn-by-turn instructions to guide the simulated user during the conversation.</p>
			{/if}
			{#each script.anchors as anchor, i (anchor.id)}
				<div class="group flex items-start gap-3">
					<span class="mt-2 w-4 shrink-0 text-right text-xs text-zinc-300">{i + 1}</span>
					<div class="mt-1.5 flex shrink-0 items-center gap-2">
						<span class="text-xs text-zinc-500">at turn</span>
						<input
							bind:value={anchor.turn}
							placeholder="4–5"
							class="w-12 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-xs text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none"
						/>
					</div>
					<textarea
						bind:value={anchor.instruction}
						placeholder="what should the simulated user do here…"
						rows="2"
						class="flex-1 resize-none rounded border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs leading-relaxed text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none"
					></textarea>
					<button
						onclick={() => removeAnchor(anchor.id)}
						class="mt-1.5 px-1 text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
						>✕</button
					>
				</div>
			{/each}
			<div class="pl-7">
				<button onclick={addAnchor} class="text-xs text-zinc-400 transition hover:text-zinc-600"
					>+ anchor</button
				>
			</div>
		</div>

		<!-- review callout -->
		<button
			onclick={toggleValidate}
			class="mt-6 w-full rounded-lg border px-4 py-3 text-left transition
			{script.validated
				? 'border-zinc-400 bg-zinc-50 hover:bg-zinc-100'
				: 'border-dashed border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50'}"
		>
			<div class="flex items-center gap-3">
				<span class="text-xl leading-none {script.validated ? 'text-emerald-500' : 'text-zinc-300'}">{script.validated ? '✓' : '○'}</span>
				<div>
					<div class="text-sm font-semibold {script.validated ? 'text-zinc-800' : 'text-zinc-700'}">
						{script.validated ? 'Anchor instructions approved' : 'Approve anchor instructions'}
					</div>
					<p class="mt-0.5 text-xs {script.validated ? 'text-zinc-500' : 'text-zinc-400'}">
						{script.validated ? 'These turn instructions are confirmed correct.' : 'Confirm each turn instruction will guide the simulator to the intended behavior.'}
					</p>
				</div>
			</div>
		</button>

	{:else if app.activeTab === 'runs'}
		{#if sRuns.length === 0}
			<div class="py-10 space-y-1">
			<div class="text-sm font-medium text-zinc-500">No runs yet</div>
			<div class="text-xs text-zinc-400">Click ▶ run above to simulate this script across the configured tested models.</div>
		</div>
		{:else}
			<!-- version selector -->
			{#if allVersions.length > 1}
				<div class="mb-3 flex items-center gap-2">
					<span class="text-xs text-zinc-400">version</span>
					<button
						onclick={() => (selectedVersion = 'latest')}
						class="text-xs {selectedVersion === 'latest' ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}"
					>latest</button>
					{#each allVersions as v (v)}
						<button
							onclick={() => (selectedVersion = v)}
							class="text-xs {selectedVersion === v ? 'text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}"
						>v{v}</button>
					{/each}
				</div>
			{/if}

			<table class="w-full">
				<thead>
					<tr>
						<th class="w-16 pr-6 pb-2 text-left text-xs font-normal text-zinc-400">round</th>
						{#each app.simParams.testedModelIds as mId (mId)}
							{@const m = allModels.find((x) => x.id === mId)}
							<th class="pr-6 pb-2 text-left text-xs font-normal text-zinc-600">{m?.name ?? mId}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each Array.from({ length: app.simParams.numRounds }, (_, i) => i + 1) as round (round)}
						<tr class="border-t border-zinc-100">
							<td class="py-2 pr-6 text-xs text-zinc-400">#{round}</td>
							{#each app.simParams.testedModelIds as mId (mId)}
								{@const run = displayedRuns.find((r) => r.modelId === mId && r.round === round)}
								<td class="py-2 pr-6">
									{#if !run || run.status === 'idle'}
										<span class="text-zinc-300">—</span>
									{:else if run.status === 'running'}
										<div class="flex items-center gap-2">
											<div class="relative h-px w-20 bg-zinc-200">
												<div class="absolute inset-y-0 left-0 bg-zinc-400 transition-all" style="width:{run.progress}%"></div>
											</div>
											<span class="text-xs text-zinc-400">{run.progress.toFixed(0)}%</span>
										</div>
									{:else if run.status === 'done'}
										{@const turns = Math.floor(run.messages.length / 2)}
										{@const firstMetric = metrics[0]?.name}
										{@const score = firstMetric ? avgScore(run, firstMetric) : null}
										{@const variance = firstMetric ? avgVariance(run, firstMetric) : 0}
										<button
											onclick={() => onOpenChat(run.id)}
											class="group flex flex-col gap-0.5 text-left transition hover:opacity-70"
										>
											<span class="text-xs text-zinc-400">{turns} turn{turns !== 1 ? 's' : ''} <span class="text-zinc-300 group-hover:text-zinc-500">view →</span></span>
											{#if score !== null}
												<span class="text-xs font-semibold tabular-nums {scoreColor(score, variance)}">{(score * 100).toFixed(0)}%</span>
											{/if}
										</button>
									{:else}
										<span class="text-xs text-red-500">error</span>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}

	{:else if app.activeTab === 'eval'}
		{#if doneRuns.length === 0}
			<div class="py-10 text-xs text-zinc-400">No completed runs yet. Run the script first.</div>
		{:else}
			<!-- aggregate stats across all runs, per metric × model -->
			<div class="space-y-6">
				{#each metrics as metric (metric.id)}
					{@const allModelRuns = app.simParams.testedModelIds.map(mId => {
						const mRuns = doneRuns.filter(r => r.modelId === mId);
						const scores = mRuns.map(r => avgScore(r, metric.name));
						const mean = scores.length ? scores.reduce((a,b) => a+b, 0) / scores.length : null;
						const spread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;
						const passCount = scores.filter(s => s >= 0.5).length;
						return { mId, mRuns, scores, mean, spread, passCount };
					})}
					<div>
						<div class="mb-0.5 text-xs font-medium text-zinc-600">{metric.name}</div>
						<div class="mb-3 text-xs text-zinc-300">{metric.description}</div>

						<!-- model summary row -->
						<div class="mb-4 flex gap-6">
							{#each allModelRuns as { mId, mRuns, mean, spread, passCount } (mId)}
								{#if mean !== null}
									{@const m = allModels.find(x => x.id === mId)}
									<div>
										<div class="mb-0.5 text-xs text-zinc-400">{m?.name ?? mId}</div>
										<div class="text-lg font-semibold tabular-nums leading-none {scoreColor(mean, spread)}">{(mean * 100).toFixed(0)}%</div>
										<div class="mt-0.5 text-xs text-zinc-400">{passCount}/{mRuns.length} pass{spread > 0 ? ` · ±${((spread * 100)/2).toFixed(0)}%` : ''}</div>
									</div>
								{/if}
							{/each}
						</div>

						<!-- per-round breakdown (collapsed by default if many rounds) -->
						{#if doneRuns.length > 1}
							<div class="space-y-1">
								{#each doneRuns.sort((a,b) => a.round - b.round) as run (run.id)}
									{@const score = avgScore(run, metric.name)}
									{@const variance = avgVariance(run, metric.name)}
									{@const justification = Object.values(run.scores[metric.name] ?? {})[0]?.justification}
									{@const m = allModels.find(x => x.id === run.modelId)}
									<div class="rounded border border-zinc-100 bg-zinc-50 px-3 py-2">
										<div class="flex items-center gap-3">
											<span class="text-xs text-zinc-400">#{run.round} {m?.name ?? run.modelId}</span>
											<span class="text-xs font-semibold tabular-nums {scoreColor(score, variance)}">{score >= 0.5 ? 'pass' : 'fail'} · {(score * 100).toFixed(0)}%</span>
										</div>
										{#if justification}
											<div class="mt-1 text-xs leading-relaxed text-zinc-400">{justification}</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else}
							{@const run = doneRuns[0]}
							{@const justification = Object.values(run.scores[metric.name] ?? {})[0]?.justification}
							{#if justification}
								<div class="text-xs leading-relaxed text-zinc-400">{justification}</div>
							{/if}
						{/if}
					</div>
				{/each}

				{#if doneRuns.some(r => Object.values(r.variance).some(v => v > 0.08))}
					<div class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
						high variance detected — consider more rounds
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
