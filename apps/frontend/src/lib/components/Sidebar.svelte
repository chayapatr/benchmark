<script lang="ts">
	import type { AppState, Run, RunStatus, Submission } from '$lib/types';

	let {
		submissions,
		runs,
		app,
		onAddSubmission,
		onAddScenario,
		onAddScript
	}: {
		submissions: Submission[];
		runs: Run[];
		app: AppState;
		onAddSubmission: () => void;
		onAddScenario: (subId: string, areaId: string) => void;
		onAddScript: (subId: string, areaId: string, scenarioId: string) => void;
	} = $props();

	function runsFor(scriptId: string) {
		return runs.filter((r) => r.scriptId === scriptId);
	}

	function allScriptIdsForSub(subId: string) {
		return (
			submissions
				.find((s) => s.id === subId)
				?.areas.flatMap((a) => a.scenarios.flatMap((s) => s.scripts.map((sc) => sc.id))) ?? []
		);
	}

	function allScriptIdsForArea(subId: string, areaId: string) {
		return (
			submissions
				.find((s) => s.id === subId)
				?.areas.find((a) => a.id === areaId)
				?.scenarios.flatMap((s) => s.scripts.map((sc) => sc.id)) ?? []
		);
	}

	function runStatusFor(scriptIds: string[]): RunStatus {
		const relevant = runs.filter((r) => scriptIds.includes(r.scriptId));
		if (relevant.some((r) => r.status === 'running')) return 'running';
		if (relevant.length > 0 && relevant.every((r) => r.status === 'done' || r.status === 'error'))
			return 'done';
		return 'idle';
	}

	function subLabel(sub: Submission) {
		if (!sub.text.trim()) return 'new submission';
		return sub.text.slice(0, 40).trimEnd() + (sub.text.length > 40 ? '…' : '');
	}

	function isScriptSelected(subId: string, aId: string, sId: string, scId: string) {
		return (
			app.selected.kind === 'script' &&
			app.selected.subId === subId &&
			app.selected.areaId === aId &&
			app.selected.scenarioId === sId &&
			app.selected.scriptId === scId
		);
	}

	function selectScript(subId: string, areaId: string, scenarioId: string, scriptId: string) {
		app.selected = { kind: 'script', subId, areaId, scenarioId, scriptId };
		app.activeTab = 'anchors';
	}
</script>

<div class="flex w-52 shrink-0 flex-col overflow-hidden border-r border-zinc-200">
	<div class="flex-1 overflow-y-auto py-1">
		{#each submissions as sub (sub.id)}
			<!-- submission row -->
			<div
				class="group flex cursor-pointer items-center gap-1 px-2 py-1 transition hover:bg-zinc-50
				{app.selected.subId === sub.id ? 'bg-zinc-50' : ''}"
				onclick={() => app.selected = { kind: 'submission', subId: sub.id }}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && (app.selected = { kind: 'submission', subId: sub.id })}
			>
				<span
					class="w-4 shrink-0 text-xs text-zinc-400 hover:text-zinc-600"
					onclick={(e) => { e.stopPropagation(); sub.open = !sub.open; }}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && (sub.open = !sub.open)}
				>{sub.open ? '▾' : '▸'}</span>
				<span class="flex-1 truncate text-sm font-medium text-zinc-700 transition group-hover:text-zinc-900"
					>{subLabel(sub)}</span
				>
				{#if runStatusFor(allScriptIdsForSub(sub.id)) === 'running'}
					<span class="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400"></span>
				{:else if runStatusFor(allScriptIdsForSub(sub.id)) === 'done'}
					<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
				{/if}
			</div>

			{#if sub.open && sub.generated}
				{#each sub.areas as area (area.id)}
					<!-- area row -->
					<div
						class="group flex cursor-pointer items-center px-2 py-1 pl-4 transition hover:bg-zinc-50
						{app.selected.kind === 'area' && app.selected.subId === sub.id && app.selected.areaId === area.id
							? 'bg-zinc-50'
							: ''}"
						onclick={() => app.selected = { kind: 'area', subId: sub.id, areaId: area.id }}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && (app.selected = { kind: 'area', subId: sub.id, areaId: area.id })}
					>
						<span
							class="w-4 shrink-0 text-xs text-zinc-400 hover:text-zinc-600"
							onclick={(e) => { e.stopPropagation(); area.open = !area.open; }}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && (area.open = !area.open)}
						>{area.open ? '▾' : '▸'}</span>
						<span class="mr-1 shrink-0 text-xs {area.validated ? 'text-emerald-500' : 'text-zinc-300'}">{area.validated ? '✓' : '○'}</span>
						<span class="flex-1 truncate transition group-hover:text-zinc-700
						{app.selected.kind === 'area' && app.selected.subId === sub.id && app.selected.areaId === area.id
							? 'text-zinc-700'
							: 'text-zinc-500'}"
							>{area.name}</span
						>
						{#if runStatusFor(allScriptIdsForArea(sub.id, area.id)) === 'running'}
							<span class="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400"></span>
						{:else if runStatusFor(allScriptIdsForArea(sub.id, area.id)) === 'done'}
							<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
						{/if}
					</div>

					{#if area.open}
						{#each area.scenarios as scenario (scenario.id)}
							<!-- scenario row -->
							<div
								class="group flex cursor-pointer items-center px-2 py-1 pl-7 transition hover:bg-zinc-50
								{app.selected.kind === 'scenario' && app.selected.scenarioId === scenario.id
									? 'bg-zinc-50'
									: ''}"
								onclick={() => app.selected = { kind: 'scenario', subId: sub.id, areaId: area.id, scenarioId: scenario.id }}
								role="button"
								tabindex="0"
								onkeydown={(e) => e.key === 'Enter' && (app.selected = { kind: 'scenario', subId: sub.id, areaId: area.id, scenarioId: scenario.id })}
							>
								<span
									class="w-4 shrink-0 text-xs text-zinc-400 hover:text-zinc-600"
									onclick={(e) => { e.stopPropagation(); scenario.open = !scenario.open; }}
									role="button"
									tabindex="0"
									onkeydown={(e) => e.key === 'Enter' && (scenario.open = !scenario.open)}
								>{scenario.open ? '▾' : '▸'}</span>
								<span class="mr-1 shrink-0 text-xs {scenario.validated ? 'text-emerald-500' : 'text-zinc-300'}">{scenario.validated ? '✓' : '○'}</span>
								{#if app.renamingId === scenario.id}
									<input
										bind:value={scenario.name}
										class="flex-1 rounded bg-zinc-100 px-1 text-xs text-zinc-800 focus:outline-none"
										onblur={() => (app.renamingId = null)}
										onkeydown={(e) => e.key === 'Enter' && (app.renamingId = null)}
										onclick={(e) => e.stopPropagation()}
									/>
								{:else}
									<span class="flex-1 truncate text-zinc-500 transition group-hover:text-zinc-700"
										>{scenario.name}</span
									>
								{/if}
							</div>

							{#if scenario.open}
								{#each scenario.scripts as script, idx (script.id)}
									{@const sRuns = runsFor(script.id)}
									{@const nRunning = sRuns.filter((r) => r.status === 'running').length}
									{@const nDone = sRuns.filter((r) => r.status === 'done').length}
									<button
										class="flex w-full items-center gap-1.5 px-2 py-0.5 pl-11 text-left transition
										{isScriptSelected(sub.id, area.id, scenario.id, script.id)
											? 'bg-zinc-100 text-zinc-900'
											: 'text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700'}"
										onclick={() => selectScript(sub.id, area.id, scenario.id, script.id)}
									>
										<span class="shrink-0 text-xs {script.validated ? 'text-emerald-500' : 'text-zinc-300'}">{script.validated ? '✓' : '○'}</span>
										<span class="flex-1 text-xs">script {idx + 1}</span>
										{#if nRunning > 0}
											<span class="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-400"
											></span>
										{:else if nDone > 0}
											<span class="shrink-0 text-xs text-zinc-400">{nDone}</span>
										{/if}
									</button>
								{/each}
								<div class="py-0.5 pl-11">
									<button
										onclick={() => onAddScript(sub.id, area.id, scenario.id)}
										class="text-xs font-medium text-zinc-400 transition hover:text-zinc-600">+ script</button
									>
								</div>
							{/if}
						{/each}
						<div class="py-0.5 pl-7">
							<button
								onclick={() => onAddScenario(sub.id, area.id)}
								class="text-xs font-medium text-zinc-400 transition hover:text-zinc-600">+ scenario</button
							>
						</div>
					{/if}
				{/each}
			{/if}
		{/each}

		<div class="px-2 py-2">
			<button onclick={onAddSubmission} class="text-xs font-medium text-zinc-400 transition hover:text-zinc-600"
				>+ submission</button
			>
		</div>
	</div>
</div>
