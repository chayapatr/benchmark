<script lang="ts">
	import type { AppState, Model, Run, RunStatus, Submission } from '$lib/types';

	let {
		allModels,
		judgeModelOptions,
		userModelOptions,
		submissions,
		runs,
		app,
		onRunScript,
		onRunScenario,
		onRunArea
	}: {
		allModels: Model[];
		judgeModelOptions: string[];
		userModelOptions: string[];
		submissions: Submission[];
		runs: Run[];
		app: AppState;
		onRunScript: (scriptId: string) => void;
		onRunScenario: (subId: string, areaId: string, scenarioId: string) => void;
		onRunArea: (subId: string, areaId: string) => void;
	} = $props();

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

	function toggleTested(modelId: string) {
		const ids = app.simParams.testedModelIds;
		app.simParams.testedModelIds = ids.includes(modelId)
			? ids.filter((id) => id !== modelId)
			: [...ids, modelId];
	}

	function toggleJudge(model: string) {
		const ids = app.evalParams.judgeModelIds;
		app.evalParams.judgeModelIds = ids.includes(model)
			? ids.filter((m) => m !== model)
			: [...ids, model];
	}
</script>

<div class="flex w-48 shrink-0 flex-col overflow-y-auto border-l border-zinc-200">

	<!-- simulation params -->
	<div class="border-b border-zinc-200 px-3 pt-3 pb-2">
		<div class="mb-2 text-xs text-zinc-400">simulation</div>

		<!-- tested (multi-select) -->
		<div class="mb-2">
			<div class="mb-1 text-xs text-zinc-400">tested</div>
			{#each allModels as model (model.id)}
				<label class="flex cursor-pointer items-center gap-1.5 py-0.5">
					<input
						type="checkbox"
						checked={app.simParams.testedModelIds.includes(model.id)}
						onchange={() => toggleTested(model.id)}
						class="shrink-0 accent-zinc-500"
					/>
					<span
						class="truncate text-xs {app.simParams.testedModelIds.includes(model.id)
							? 'text-zinc-700'
							: 'text-zinc-400'}">{model.name}</span
					>
				</label>
			{/each}
		</div>

		<!-- simulator (single select) -->
		<div class="mb-2 flex items-center justify-between gap-2">
			<span class="w-14 shrink-0 text-xs text-zinc-400">simulator</span>
			<select
				bind:value={app.simParams.simulatorModelId}
				class="min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-700 focus:outline-none"
			>
				{#each userModelOptions as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-xs text-zinc-400">temp</span>
			<input
				type="number"
				bind:value={app.simParams.temperature}
				min="0"
				max="2"
				step="0.1"
				class="w-14 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-right text-xs text-zinc-700 focus:outline-none"
			/>
		</div>
		<div class="mt-1 flex items-center justify-between">
			<span class="text-xs text-zinc-400">turns</span>
			<input
				type="number"
				bind:value={app.simParams.maxTurns}
				min="1"
				max="30"
				class="w-14 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-right text-xs text-zinc-700 focus:outline-none"
			/>
		</div>
		<div class="mt-1 flex items-center justify-between">
			<span class="text-xs text-zinc-400">rounds</span>
			<div class="flex items-center overflow-hidden rounded border border-zinc-200">
				<button
					onclick={() => (app.simParams.numRounds = Math.max(1, app.simParams.numRounds - 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">−</button
				>
				<span class="w-6 border-x border-zinc-200 py-0.5 text-center text-xs text-zinc-700"
					>{app.simParams.numRounds}</span
				>
				<button
					onclick={() => (app.simParams.numRounds = Math.min(10, app.simParams.numRounds + 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">+</button
				>
			</div>
		</div>
	</div>

	<!-- evaluation params -->
	<div class="border-b border-zinc-200 px-3 py-2">
		<div class="mb-2 text-xs text-zinc-400">evaluation</div>

		<!-- judge (multi-select) -->
		<div class="mb-2">
			<div class="mb-1 text-xs text-zinc-400">judge</div>
			{#each judgeModelOptions as jm (jm)}
				<label class="flex cursor-pointer items-center gap-1.5 py-0.5">
					<input
						type="checkbox"
						checked={app.evalParams.judgeModelIds.includes(jm)}
						onchange={() => toggleJudge(jm)}
						class="shrink-0 accent-zinc-500"
					/>
					<span
						class="truncate text-xs {app.evalParams.judgeModelIds.includes(jm)
							? 'text-zinc-700'
							: 'text-zinc-400'}">{jm}</span
					>
				</label>
			{/each}
		</div>

		<div class="flex items-center justify-between">
			<span class="text-xs text-zinc-400">rounds</span>
			<div class="flex items-center overflow-hidden rounded border border-zinc-200">
				<button
					onclick={() => (app.evalParams.numRounds = Math.max(1, app.evalParams.numRounds - 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">−</button
				>
				<span class="w-6 border-x border-zinc-200 py-0.5 text-center text-xs text-zinc-700"
					>{app.evalParams.numRounds}</span
				>
				<button
					onclick={() => (app.evalParams.numRounds = Math.min(10, app.evalParams.numRounds + 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">+</button
				>
			</div>
		</div>
	</div>

	<!-- run buttons -->
	<div class="space-y-1.5 px-3 py-3">
		<div class="mb-2 text-xs text-zinc-400">run</div>

		{#if app.selected.kind === 'script'}
			{@const sel = app.selected}
			{@const s = runsFor(sel.scriptId)}
			{@const n = getScriptNum(sel.subId, sel.areaId, sel.scenarioId, sel.scriptId)}
			<button
				onclick={() => {
					onRunScript(sel.scriptId);
					app.activeTab = 'runs';
				}}
				disabled={s.some((r) => r.status === 'running')}
				class="flex w-full items-center justify-between rounded border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-600 transition hover:border-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
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
				class="flex w-full items-center justify-between rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-40"
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
					class="flex w-full items-center justify-between rounded border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-40"
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
