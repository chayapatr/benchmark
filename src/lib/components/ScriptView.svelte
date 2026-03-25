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
</script>

<!-- tab bar + run button -->
<div class="flex shrink-0 items-center justify-between border-b border-zinc-200 px-2">
	<div class="flex">
		{#each TABS as tab (tab)}
			<button
				onclick={() => (app.activeTab = tab)}
				class="-mb-px border-b-2 px-3 py-2 text-xs transition
				{app.activeTab === tab
					? 'border-zinc-500 text-zinc-800'
					: 'border-transparent text-zinc-400 hover:text-zinc-600'}"
			>
				{tab}
				{#if tab === 'runs' && sRuns.length > 0}
					<span class="ml-1 text-zinc-300">{doneRuns.length}/{sRuns.length}</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- inline run button -->
	<button
		onclick={() => {
			onRunScript(script.id);
			app.activeTab = 'runs';
		}}
		disabled={isRunning}
		class="flex items-center gap-1.5 rounded border border-zinc-200 px-2.5 py-1 text-xs text-zinc-500 transition hover:border-zinc-400 hover:text-zinc-700 disabled:opacity-40 mr-1"
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

<div class="flex-1 overflow-y-auto px-5 py-4">
	{#if app.activeTab === 'anchors'}
		<div class="mb-4 text-xs text-zinc-400">{areaName} / {scenarioName} / script {scriptNum}</div>
		<div class="space-y-1">
			{#each script.anchors as anchor, i (anchor.id)}
				<div class="group flex items-start gap-3">
					<span class="mt-2 w-4 shrink-0 text-right text-xs text-zinc-300">{i + 1}</span>
					<div class="mt-1.5 flex shrink-0 items-center gap-2">
						<span class="text-xs text-zinc-400">turn</span>
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

	{:else if app.activeTab === 'runs'}
		{#if sRuns.length === 0}
			<div class="py-10 text-zinc-300">no runs yet — click ▶ run above or use the run panel →</div>
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
								{@const run = displayedRuns.find(
									(r) => r.modelId === mId && r.round === round
								)}
								<td class="py-2 pr-6">
									{#if !run || run.status === 'idle'}
										<span class="text-zinc-300">—</span>
									{:else if run.status === 'running'}
										<div class="flex items-center gap-2">
											<div class="relative h-px w-20 bg-zinc-200">
												<div
													class="absolute inset-y-0 left-0 bg-zinc-400 transition-all"
													style="width:{run.progress}%"
												></div>
											</div>
											<span class="text-xs text-zinc-400">{run.progress.toFixed(0)}%</span>
										</div>
									{:else if run.status === 'done'}
										{@const firstMetric = metrics[0]?.name}
										{@const score = firstMetric ? avgScore(run, firstMetric) : 0}
										{@const variance = firstMetric ? avgVariance(run, firstMetric) : 0}
										<button
											onclick={() => onOpenChat(run.id)}
											class="group flex items-center gap-2 text-left transition hover:opacity-70"
										>
											<span class="{scoreColor(score, variance)} text-xs tabular-nums">
												{firstMetric ? (score * 100).toFixed(0) + '%' : '—'}
											</span>
											<span class="text-xs text-zinc-300 group-hover:text-zinc-500">view →</span>
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
			<div class="py-10 text-zinc-300">no completed runs yet</div>
		{:else}
			{@const allRounds = [...new Set(displayedRuns.filter(r => r.status === 'done').map((r) => r.round))].sort((a, b) => a - b)}
			{@const judgeIds = [...new Set(doneRuns.flatMap((r) => Object.values(r.scores).flatMap((s) => Object.keys(s))))]}

			{#if judgeIds.length > 1}
				<div class="mb-3">
					<button
						onclick={() => (showJudgeBreakdown = !showJudgeBreakdown)}
						class="text-xs text-zinc-400 transition hover:text-zinc-600"
					>
						{showJudgeBreakdown ? 'hide' : 'show'} per-judge breakdown
						<span class="ml-1 text-zinc-300">({judgeIds.length} judges)</span>
					</button>
				</div>
			{/if}

			<div class="space-y-8">
				{#each metrics as metric (metric.id)}
					<div>
						<div class="mb-1 text-xs text-zinc-400">{metric.name}</div>
						<div class="mb-3 text-xs text-zinc-300">{metric.description}</div>

						{#if showJudgeBreakdown && judgeIds.length > 1}
							{#each judgeIds as judgeId (judgeId)}
								<div class="mb-3">
									<div class="mb-1 text-xs text-zinc-300 italic">judge: {judgeId}</div>
									<table class="w-full">
										<thead>
											<tr>
												<th class="w-14 pr-4 pb-1 text-left text-xs font-normal text-zinc-300">round</th>
												{#each app.simParams.testedModelIds as mId (mId)}
													<th class="pr-4 pb-1 text-left text-xs font-normal text-zinc-400">{allModels.find(x => x.id === mId)?.name ?? mId}</th>
												{/each}
											</tr>
										</thead>
										<tbody>
											{#each allRounds as round (round)}
												<tr class="border-t border-zinc-100">
													<td class="py-1 pr-4 text-xs text-zinc-300">#{round}</td>
													{#each app.simParams.testedModelIds as mId (mId)}
														{@const run = displayedRuns.find((r) => r.modelId === mId && r.round === round && r.status === 'done')}
														{@const js = run?.scores[metric.name]?.[judgeId]}
														<td class="py-1 pr-4">
															{#if js}
																<span class="text-xs tabular-nums {scoreColor(js.score, 0)}">{(js.score * 100).toFixed(0)}%</span>
															{:else}
																<span class="text-xs text-zinc-300">—</span>
															{/if}
														</td>
													{/each}
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/each}
						{/if}

						<!-- averaged table -->
						<table class="w-full">
							<thead>
								<tr>
									<th class="w-14 pr-5 pb-2 text-left text-xs font-normal text-zinc-400">round</th>
									{#each app.simParams.testedModelIds as mId (mId)}
										{@const m = allModels.find((x) => x.id === mId)}
										<th class="pr-5 pb-2 text-left text-xs font-normal text-zinc-500">{m?.name ?? mId}</th>
									{/each}
								</tr>
							</thead>
							<tbody>
								{#each allRounds as round (round)}
									<tr class="border-t border-zinc-100">
										<td class="py-1.5 pr-5 text-xs text-zinc-400">#{round}</td>
										{#each app.simParams.testedModelIds as mId (mId)}
											{@const run = displayedRuns.find((r) => r.modelId === mId && r.round === round && r.status === 'done')}
											<td class="py-1.5 pr-5">
												{#if run}
													{@const score = avgScore(run, metric.name)}
													{@const variance = avgVariance(run, metric.name)}
													<button
														onclick={() => onOpenChat(run.id)}
														class="group flex items-center gap-2 text-left transition hover:opacity-70"
													>
														<span class="text-xs tabular-nums {scoreColor(score, variance)}">{(score * 100).toFixed(0)}%</span>
														<span class="text-xs text-zinc-300 group-hover:text-zinc-400">view →</span>
													</button>
												{:else}
													<span class="text-xs text-zinc-300">—</span>
												{/if}
											</td>
										{/each}
									</tr>
								{/each}
								{#if allRounds.length > 1}
									<tr class="border-t border-zinc-300">
										<td class="py-1.5 pr-5 text-xs text-zinc-500">mean</td>
										{#each app.simParams.testedModelIds as mId (mId)}
											{@const mRuns = displayedRuns.filter((r) => r.modelId === mId && r.status === 'done')}
											{#if mRuns.length > 0}
												{@const scores = mRuns.map((r) => avgScore(r, metric.name))}
												{@const mean = scores.reduce((a, b) => a + b, 0) / scores.length}
												{@const spread = Math.max(...scores) - Math.min(...scores)}
												<td class="py-1.5 pr-5">
													<span class="text-xs font-semibold tabular-nums {scoreColor(mean, spread)}">{(mean * 100).toFixed(0)}%</span>
													<span class="ml-1 text-xs text-zinc-400">±{((spread * 100) / 2).toFixed(0)}%</span>
												</td>
											{:else}
												<td class="py-1.5 pr-5 text-xs text-zinc-300">—</td>
											{/if}
										{/each}
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				{/each}
				{#if doneRuns.some((r) => Object.values(r.variance).some((v) => v > 0.08))}
					<div class="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
						variance &gt;8% detected — consider more rounds
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
