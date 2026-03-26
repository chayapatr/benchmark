<script lang="ts">
	import type { AppState, Run, RunStatus, Submission } from '$lib/types';

	let {
		submissions,
		runs,
		app,
		onRunScript,
		onRunScenario,
		onRunArea
	}: {
		submissions: Submission[];
		runs: Run[];
		app: AppState;
		onRunScript: (scriptId: string) => void;
		onRunScenario: (subId: string, areaId: string, scenarioId: string) => void;
		onRunArea: (subId: string, areaId: string) => void;
	} = $props();

	const PROVIDERS = ['openai', 'anthropic', 'deepinfra'] as const;

	// ── Add-model UI state ────────────────────────────────────────────────────
	let addTestedProvider = $state<string>('openai');
	let addTestedModel = $state('');
	let addJudgeProvider = $state<string>('openai');
	let addJudgeModel = $state('');

	// ── Simulator split state ─────────────────────────────────────────────────
	function splitId(id: string) {
		const idx = id.indexOf(':');
		if (idx === -1) return { provider: 'openai', model: id };
		return { provider: id.slice(0, idx), model: id.slice(idx + 1) };
	}

	let simParts = $derived(splitId(app.simParams.simulatorModelId));

	function setSimulator(provider: string, model: string) {
		if (provider && model) app.simParams.simulatorModelId = `${provider}:${model}`;
	}

	// ── Tested models ─────────────────────────────────────────────────────────
	function addTested() {
		const id = `${addTestedProvider}:${addTestedModel.trim()}`;
		if (!addTestedModel.trim() || app.simParams.testedModelIds.includes(id)) return;
		app.simParams.testedModelIds = [...app.simParams.testedModelIds, id];
		addTestedModel = '';
	}

	function removeTested(id: string) {
		app.simParams.testedModelIds = app.simParams.testedModelIds.filter((m) => m !== id);
	}

	// ── Judge models ──────────────────────────────────────────────────────────
	function addJudge() {
		const id = `${addJudgeProvider}:${addJudgeModel.trim()}`;
		if (!addJudgeModel.trim() || app.evalParams.judgeModelIds.includes(id)) return;
		app.evalParams.judgeModelIds = [...app.evalParams.judgeModelIds, id];
		addJudgeModel = '';
	}

	function removeJudge(id: string) {
		app.evalParams.judgeModelIds = app.evalParams.judgeModelIds.filter((m) => m !== id);
	}

	// ── Run helpers ───────────────────────────────────────────────────────────
	function allScriptIdsForArea(subId: string, areaId: string) {
		return (
			submissions
				.find((s) => s.id === subId)
				?.areas.find((a) => a.id === areaId)
				?.scenarios.flatMap((s) => s.scripts.map((sc) => sc.id)) ?? []
		);
	}

	function runsFor(scriptId: string) {
		return runs.filter((r) => r.scriptId === scriptId);
	}

	function runStatusFor(scriptIds: string[]): RunStatus {
		const relevant = runs.filter((r) => scriptIds.includes(r.scriptId));
		if (relevant.some((r) => r.status === 'running')) return 'running';
		if (relevant.length > 0 && relevant.every((r) => r.status === 'done' || r.status === 'error'))
			return 'done';
		return 'idle';
	}

	function getScriptNum(subId: string, areaId: string, scenarioId: string, scriptId: string) {
		const sub = submissions.find((s) => s.id === subId);
		const area = sub?.areas.find((a) => a.id === areaId);
		const scenario = area?.scenarios.find((s) => s.id === scenarioId);
		return (scenario?.scripts.findIndex((s) => s.id === scriptId) ?? -1) + 1;
	}

	const providerColor: Record<string, string> = {
		openai: 'bg-emerald-100 text-emerald-700',
		anthropic: 'bg-orange-100 text-orange-700',
		deepinfra: 'bg-purple-100 text-purple-700',
	};

	function providerBadge(provider: string) {
		return providerColor[provider] ?? 'bg-zinc-100 text-zinc-600';
	}
</script>

<div class="flex w-52 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 text-xs">

	<!-- simulation params -->
	<div class="border-b border-zinc-200 px-3 pt-3 pb-2 space-y-2">
		<div class="text-zinc-400">simulation</div>

		<!-- tested models -->
		<div>
			<div class="mb-1 text-zinc-400">tested</div>
			{#each app.simParams.testedModelIds as id (id)}
				{@const p = splitId(id)}
				<div class="flex items-center gap-1 py-0.5">
					<span class="shrink-0 rounded px-1 py-px text-[10px] font-medium {providerBadge(p.provider)}">{p.provider.slice(0,4)}</span>
					<span class="min-w-0 flex-1 truncate text-zinc-700">{p.model}</span>
					<button onclick={() => removeTested(id)} class="shrink-0 text-zinc-300 hover:text-zinc-500">×</button>
				</div>
			{/each}
			<!-- add row -->
			<div class="mt-1 flex items-center gap-1">
				<select
					bind:value={addTestedProvider}
					class="w-20 shrink-0 rounded border border-zinc-200 bg-white px-1 py-0.5 text-zinc-600 focus:outline-none"
				>
					{#each PROVIDERS as p (p)}<option value={p}>{p}</option>{/each}
				</select>
				<input
					bind:value={addTestedModel}
					onkeydown={(e) => e.key === 'Enter' && addTested()}
					placeholder="model"
					class="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700 placeholder-zinc-300 focus:outline-none"
				/>
				<button
					onclick={addTested}
					class="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50"
				>+</button>
			</div>
		</div>

		<!-- simulator -->
		<div>
			<div class="mb-1 text-zinc-400">simulator</div>
			<div class="flex items-center gap-1">
				<select
					value={simParts.provider}
					onchange={(e) => setSimulator((e.target as HTMLSelectElement).value, simParts.model)}
					class="w-20 shrink-0 rounded border border-zinc-200 bg-white px-1 py-0.5 text-zinc-600 focus:outline-none"
				>
					{#each PROVIDERS as p (p)}<option value={p}>{p}</option>{/each}
				</select>
				<input
					value={simParts.model}
					onchange={(e) => setSimulator(simParts.provider, (e.target as HTMLInputElement).value)}
					placeholder="model"
					class="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700 placeholder-zinc-300 focus:outline-none"
				/>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-zinc-400">turns</span>
			<input type="number" bind:value={app.simParams.maxTurns} min="1" max="30"
				class="w-14 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-right text-zinc-700 focus:outline-none" />
		</div>
		<div class="flex items-center justify-between">
			<span class="text-zinc-400">rounds</span>
			<div class="flex items-center overflow-hidden rounded border border-zinc-200">
				<button onclick={() => (app.simParams.numRounds = Math.max(1, app.simParams.numRounds - 1))}
					class="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100">−</button>
				<span class="w-6 border-x border-zinc-200 py-0.5 text-center text-zinc-700">{app.simParams.numRounds}</span>
				<button onclick={() => (app.simParams.numRounds = Math.min(10, app.simParams.numRounds + 1))}
					class="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100">+</button>
			</div>
		</div>
	</div>

	<!-- evaluation params -->
	<div class="border-b border-zinc-200 px-3 py-2 space-y-2">
		<div class="text-zinc-400">evaluation</div>

		<!-- judge models -->
		<div>
			<div class="mb-1 text-zinc-400">judge</div>
			{#each app.evalParams.judgeModelIds as id (id)}
				{@const p = splitId(id)}
				<div class="flex items-center gap-1 py-0.5">
					<span class="shrink-0 rounded px-1 py-px text-[10px] font-medium {providerBadge(p.provider)}">{p.provider.slice(0,4)}</span>
					<span class="min-w-0 flex-1 truncate text-zinc-700">{p.model}</span>
					<button onclick={() => removeJudge(id)} class="shrink-0 text-zinc-300 hover:text-zinc-500">×</button>
				</div>
			{/each}
			<!-- add row -->
			<div class="mt-1 flex items-center gap-1">
				<select
					bind:value={addJudgeProvider}
					class="w-20 shrink-0 rounded border border-zinc-200 bg-white px-1 py-0.5 text-zinc-600 focus:outline-none"
				>
					{#each PROVIDERS as p (p)}<option value={p}>{p}</option>{/each}
				</select>
				<input
					bind:value={addJudgeModel}
					onkeydown={(e) => e.key === 'Enter' && addJudge()}
					placeholder="model"
					class="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700 placeholder-zinc-300 focus:outline-none"
				/>
				<button
					onclick={addJudge}
					class="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50"
				>+</button>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-zinc-400">rounds</span>
			<div class="flex items-center overflow-hidden rounded border border-zinc-200">
				<button onclick={() => (app.evalParams.numRounds = Math.max(1, app.evalParams.numRounds - 1))}
					class="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100">−</button>
				<span class="w-6 border-x border-zinc-200 py-0.5 text-center text-zinc-700">{app.evalParams.numRounds}</span>
				<button onclick={() => (app.evalParams.numRounds = Math.min(10, app.evalParams.numRounds + 1))}
					class="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100">+</button>
			</div>
		</div>
	</div>

	<!-- run buttons -->
	<div class="space-y-1.5 px-3 py-3">
		<div class="mb-2 text-zinc-400">run</div>

		{#if app.selected.kind === 'script'}
			{@const sel = app.selected}
			{@const s = runsFor(sel.scriptId)}
			{@const n = getScriptNum(sel.subId, sel.areaId, sel.scenarioId, sel.scriptId)}
			<button
				onclick={() => { onRunScript(sel.scriptId); app.activeTab = 'runs'; }}
				disabled={s.some((r) => r.status === 'running')}
				class="flex w-full items-center justify-between rounded border border-zinc-300 px-2.5 py-1.5 text-zinc-600 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
			>
				<span>script {n}</span>
				{#if s.some((r) => r.status === 'running')}
					<span class="h-2 w-2 animate-pulse rounded-full bg-amber-400"></span>
				{:else if s.some((r) => r.status === 'done')}
					<span class="text-zinc-400">▶ re-run</span>
				{:else}
					<span>▶</span>
				{/if}
			</button>
		{/if}

		{#if app.selected.kind === 'scenario' || app.selected.kind === 'script'}
			{@const sel = app.selected}
			{@const sub = submissions.find((s) => s.id === sel.subId)}
			{@const area = sub?.areas.find((a) => a.id === sel.areaId)}
			{@const scenario = area?.scenarios.find((s) => s.id === sel.scenarioId)}
			{@const scIds = scenario?.scripts.map((s) => s.id) ?? []}
			{@const scStatus = runStatusFor(scIds)}
			<button
				onclick={() => onRunScenario(sel.subId, sel.areaId, sel.scenarioId)}
				disabled={scStatus === 'running'}
				class="flex w-full items-center justify-between rounded border border-zinc-200 px-2.5 py-1.5 text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-40"
			>
				<span class="truncate">{scenario?.name ?? 'scenario'}</span>
				{#if scStatus === 'running'}
					<span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400"></span>
				{:else}
					<span class="shrink-0">▶</span>
				{/if}
			</button>
		{/if}

		{#each submissions.filter((s) => s.generated) as sub (sub.id)}
			{#each sub.areas as area (area.id)}
				{@const aIds = allScriptIdsForArea(sub.id, area.id)}
				{@const aStatus = runStatusFor(aIds)}
				<button
					onclick={() => onRunArea(sub.id, area.id)}
					disabled={aStatus === 'running'}
					class="flex w-full items-center justify-between rounded border border-zinc-200 px-2.5 py-1.5 text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40"
				>
					<span class="truncate">{area.name}</span>
					{#if aStatus === 'running'}
						<span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-400"></span>
					{:else if aStatus === 'done'}
						<span class="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></span>
					{:else}
						<span class="shrink-0">▶</span>
					{/if}
				</button>
			{/each}
		{/each}
	</div>
</div>
