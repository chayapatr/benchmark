<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import SubmissionView from '$lib/components/SubmissionView.svelte';
	import ScriptView from '$lib/components/ScriptView.svelte';
	import ScenarioView from '$lib/components/ScenarioView.svelte';
	import AreaView from '$lib/components/AreaView.svelte';
	import RightSidebar from '$lib/components/RightSidebar.svelte';
	import ChatDrawer from '$lib/components/ChatDrawer.svelte';

	import type { AppState, Run, Submission, Area, Scenario, Script, Anchor } from '$lib/types';
	import rawData from '$lib/data.json';
	import { streamGenerate, streamSimulate, streamEvaluate, type GeneratedArea } from '$lib/api';

	// ── model helpers ─────────────────────────────────────────────────────────────

	function modelFromId(id: string) {
		const idx = id.indexOf(':');
		const provider = idx !== -1 ? id.slice(0, idx) : 'openai';
		const name = idx !== -1 ? id.slice(idx + 1) : id;
		return { id, name, provider };
	}

	// ── localStorage persistence helpers ──────────────────────────────────────────

	function load<T>(key: string, fallback: T): T {
		if (typeof localStorage === 'undefined') return fallback;
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as T) : fallback;
		} catch {
			return fallback;
		}
	}

	function save(key: string, value: unknown) {
		if (typeof localStorage === 'undefined') return;
		try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
	}

	// ── state (loaded from localStorage, falls back to empty) ─────────────────────

	let submissions = $state<Submission[]>(load('bm:submissions', []));
	let runs = $state<Run[]>(load('bm:runs', []));

	let app = $state<AppState>({
		selected: load('bm:selected', { kind: 'submission', subId: '' } as AppState['selected']),
		activeTab: 'anchors',
		openChat: null,
		renamingId: null,
		simParams: load('bm:simParams', { ...rawData.defaultSimParams }),
		evalParams: load('bm:evalParams', { ...rawData.defaultEvalParams })
	});

	// ── auto-save on every change ─────────────────────────────────────────────────

	$effect(() => { save('bm:submissions', submissions); });
	$effect(() => {
		// don't persist running/idle runs — only completed ones
		save('bm:runs', runs.filter(r => r.status === 'done' || r.status === 'error'));
	});
	$effect(() => { save('bm:selected', app.selected); });
	$effect(() => { save('bm:simParams', app.simParams); });
	$effect(() => { save('bm:evalParams', app.evalParams); });

	// ── derived lookups ───────────────────────────────────────────────────────────

	function getSub(id: string) {
		return submissions.find((s) => s.id === id);
	}
	function getArea(subId: string, aId: string) {
		return getSub(subId)?.areas.find((a) => a.id === aId);
	}
	function getScenario(subId: string, aId: string, sId: string) {
		return getArea(subId, aId)?.scenarios.find((s) => s.id === sId);
	}
	function getScript(subId: string, aId: string, sId: string, scId: string) {
		return getScenario(subId, aId, sId)?.scripts.find((s) => s.id === scId);
	}

	let curSub = $derived(getSub(app.selected.subId));
	let curArea = $derived(
		app.selected.kind === 'area' ? getArea(app.selected.subId, app.selected.areaId) : null
	);
	let curScenario = $derived(
		app.selected.kind === 'scenario' || app.selected.kind === 'script'
			? getScenario(app.selected.subId, app.selected.areaId, app.selected.scenarioId)
			: null
	);
	let curScript = $derived(
		app.selected.kind === 'script'
			? getScript(
					app.selected.subId,
					app.selected.areaId,
					app.selected.scenarioId,
					app.selected.scriptId
				)
			: null
	);
	let curScriptNum = $derived(
		app.selected.kind === 'script'
			? (getScenario(
					app.selected.subId,
					app.selected.areaId,
					app.selected.scenarioId
				)?.scripts.findIndex((s) => s.id === (app.selected as { scriptId: string }).scriptId) ??
					-1) + 1
			: 0
	);

	let openChatRun = $derived(app.openChat ? runs.find((r) => r.id === app.openChat) ?? null : null);
	let openChatModel = $derived(openChatRun ? modelFromId(openChatRun.modelId) : undefined);

	// allModels derived from current tested model IDs (used by ScriptView eval headers)
	let allModels = $derived(app.simParams.testedModelIds.map(modelFromId));

	// ── run management ────────────────────────────────────────────────────────────

	/** Get the next version number for a (modelId, scriptId, round) triple */
	function nextVersion(modelId: string, scriptId: string, round: number): number {
		const existing = runs.filter(
			(r) => r.modelId === modelId && r.scriptId === scriptId && r.round === round
		);
		return existing.length > 0 ? Math.max(...existing.map((r) => r.version)) + 1 : 1;
	}

	function makeRun(modelId: string, scriptId: string, round: number): Run {
		const version = nextVersion(modelId, scriptId, round);
		return {
			id: `${modelId}-${scriptId}-r${round}-v${version}`,
			modelId,
			scriptId,
			round,
			version,
			status: 'idle',
			progress: 0,
			messages: [],
			scores: {},
			variance: {}
		};
	}

	/** Find the scenario that contains a given scriptId */
	function findScriptContext(scriptId: string) {
		for (const sub of submissions) {
			for (const area of sub.areas) {
				for (const scenario of area.scenarios) {
					const script = scenario.scripts.find((s) => s.id === scriptId);
					if (script) return { sub, area, scenario, script };
				}
			}
		}
		return null;
	}

	async function launchRun(run: Run) {
		const ctx = findScriptContext(run.scriptId);
		if (!ctx) { run.status = 'error'; return; }

		const { sub, scenario, script } = ctx;
		const judgeIds = app.evalParams.judgeModelIds;

		run.status = 'running';
		run.progress = 0;
		run.messages = [];

		// ── Phase 2: simulate ────────────────────────────────────────────────────
		try {
			const maxTurns = app.simParams.maxTurns;
			let turnCount = 0;

			for await (const event of streamSimulate({
				runId: run.id,
				submissionText: sub.text,
				scenarioName: scenario.name,
				scenarioDescription: scenario.description,
				userPersona: scenario.userPersona,
				userGoal: scenario.userGoal,
				targetSystemPrompt: scenario.targetSystemPrompt,
				anchors: script.anchors,
				modelId: run.modelId,
				round: run.round,
				simParams: {
					simulatorModelId: app.simParams.simulatorModelId,
					temperature: app.simParams.temperature,
					maxTurns
				}
			})) {
				if (event.type === 'turn') {
					run.messages = [...run.messages, { role: event.role, content: event.content }];
					turnCount++;
					// progress: simulation is 0-80%, evaluation is 80-100%
					run.progress = Math.min(Math.round((turnCount / (maxTurns * 2)) * 80), 79);
				} else if (event.type === 'error') {
					throw new Error(event.message);
				}
			}
		} catch (err) {
			console.error('Simulation error:', err);
			run.status = 'error';
			return;
		}

		// ── Phase 3: evaluate ────────────────────────────────────────────────────
		if (!judgeIds.length || !sub.metrics.length) {
			run.progress = 100;
			run.status = 'done';
			return;
		}

		try {
			const totalScores = sub.metrics.length * judgeIds.length;
			let scoreCount = 0;

			for await (const event of streamEvaluate({
				runId: run.id,
				scenarioDescription: scenario.description,
				messages: run.messages,
				metrics: sub.metrics,
				judgeModelIds: judgeIds
			})) {
				if (event.type === 'score') {
					if (!run.scores[event.metricName]) run.scores[event.metricName] = {};
					run.scores[event.metricName][event.judgeId] = {
						score: event.score,
						justification: event.justification
					};
					// trigger reactivity
					run.scores = { ...run.scores };
					scoreCount++;
					run.progress = 80 + Math.round((scoreCount / totalScores) * 20);
				} else if (event.type === 'error') {
					throw new Error(event.message);
				}
			}

			// compute per-metric variance across judges
			run.variance = Object.fromEntries(
				Object.entries(run.scores).map(([metric, byJudge]) => {
					const vals = Object.values(byJudge).map((j) => j.score);
					if (vals.length < 2) return [metric, 0];
					const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
					const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
					return [metric, Math.sqrt(variance)]; // std dev
				})
			);

			run.progress = 100;
			run.status = 'done';
		} catch (err) {
			console.error('Evaluation error:', err);
			// simulation succeeded — mark done even if eval failed
			run.progress = 100;
			run.status = 'done';
		}
	}

	/** Always creates fresh runs (appends, never overwrites) */
	function enqueueRuns(scriptIds: string[]) {
		const newIds: string[] = [];
		for (const scriptId of scriptIds) {
			for (const modelId of app.simParams.testedModelIds) {
				for (let r = 1; r <= app.simParams.numRounds; r++) {
					const run = makeRun(modelId, scriptId, r);
					runs.push(run);
					newIds.push(run.id);
				}
			}
		}
		// Use the reactive proxies from the state array, not the plain objects
		let delay = 0;
		for (const id of newIds) {
			const reactiveRun = runs.find(r => r.id === id);
			if (reactiveRun) setTimeout(() => launchRun(reactiveRun), delay);
			delay += 120 + Math.random() * 200;
		}
	}

	// ── tree mutations ────────────────────────────────────────────────────────────

	function addSubmission() {
		const sub: Submission = {
			id: crypto.randomUUID(),
			text: '',
			genParams: { numScenarios: 3, numScripts: 2, generatorModel: 'gpt-4o' },
			metrics: [],
			areas: [],
			open: true,
			generated: false,
			generating: false
		};
		submissions.push(sub);
		app.selected = { kind: 'submission', subId: sub.id };
	}

	async function generateSubmission(sub: Submission) {
		if (!sub.text.trim()) return;
		sub.generating = true;

		try {
			for await (const event of streamGenerate(sub.text, sub.genParams)) {
				if (event.type === 'done') {
					// Map backend output → frontend types (add ids, open, validated flags)
					sub.areas = (event.areas as GeneratedArea[]).map((a): Area => ({
						id: crypto.randomUUID(),
						name: a.name,
						open: true,
						validated: false,
						scenarios: a.scenarios.map((sc): Scenario => ({
							id: crypto.randomUUID(),
							name: sc.name,
							description: sc.description,
							userPersona: sc.userPersona,
							userGoal: sc.userGoal,
							targetSystemPrompt: sc.targetSystemPrompt,
							open: true,
							validated: false,
							scripts: sc.scripts.map((): Script => ({
								id: crypto.randomUUID(),
								anchors: (sc.scripts[0]?.anchors ?? []).map((a): Anchor => ({
									id: crypto.randomUUID(),
									turn: a.turn,
									instruction: a.instruction
								})),
								validated: false
							}))
						}))
					}));

					sub.metrics = event.metrics.map((m) => ({
						id: crypto.randomUUID(),
						name: m.name,
						description: m.description
					}));

					sub.generated = true;
				} else if (event.type === 'error') {
					console.error('Generation error:', event.message);
				}
			}
		} catch (err) {
			console.error('Generate failed:', err);
		} finally {
			sub.generating = false;
		}
	}

	function addScript(subId: string, areaId: string, scenarioId: string) {
		const sc = getScenario(subId, areaId, scenarioId);
		if (!sc) return;
		const id = crypto.randomUUID();
		sc.scripts.push({ id, anchors: [], validated: false });
		app.selected = { kind: 'script', subId, areaId, scenarioId, scriptId: id };
		app.activeTab = 'anchors';
	}

	function addScenario(subId: string, areaId: string) {
		const a = getArea(subId, areaId);
		if (!a) return;
		const id = crypto.randomUUID();
		a.scenarios.push({ id, name: 'new scenario', description: '', scripts: [], open: true, validated: false });
		app.selected = { kind: 'scenario', subId, areaId, scenarioId: id };
		setTimeout(() => (app.renamingId = id), 40);
	}

	function subLabel(sub: Submission) {
		if (!sub.text.trim()) return 'new submission';
		return sub.text.slice(0, 40).trimEnd() + (sub.text.length > 40 ? '…' : '');
	}
</script>

<div
	class="flex h-screen flex-col bg-white text-zinc-700"
	style="font-family:'Inter', 'Menlo','Monaco','Consolas','Courier New',monospace;font-size:13px;"
>
	<!-- topbar -->
	<div class="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-2">
		<span class="font-semibold tracking-tight text-zinc-800">benchmark</span>
		<span class="text-xs text-zinc-400">
			{submissions.filter((s) => s.generated).length} submission{submissions.filter((s) => s.generated).length !== 1 ? 's' : '' } ·
			{submissions.flatMap((s) => s.areas).length} area{submissions.flatMap((s) => s.areas).length !== 1 ? 's' : '' }
		</span>
	</div>

	<div class="flex flex-1 overflow-hidden">
		<!-- left sidebar -->
		<Sidebar
			{submissions}
			{runs}
			{app}
			onAddSubmission={addSubmission}
			onAddScenario={addScenario}
			onAddScript={addScript}
		/>

		<!-- center panel + inline chat column -->
		<div class="flex flex-1 overflow-hidden">
			<div class="flex flex-1 flex-col overflow-hidden">
				{#if app.selected.kind === 'submission' && curSub}
					<SubmissionView
						sub={curSub}
						onGenerate={generateSubmission}
					/>
				{:else if app.selected.kind === 'script' && curScript && curSub}
					<ScriptView
						script={curScript}
						scenarioName={curScenario?.name ?? ''}
						areaName={app.selected.kind === 'script'
							? (getArea(app.selected.subId, app.selected.areaId)?.name ?? '')
							: ''}
						scriptNum={curScriptNum}
						{runs}
						metrics={curSub.metrics}
						{allModels}
						{app}
						onOpenChat={(id) => (app.openChat = id)}
						onRunScript={(scriptId) => enqueueRuns([scriptId])}
					/>
				{:else if app.selected.kind === 'scenario' && curScenario}
					<ScenarioView
						scenario={curScenario}
						areaName={getArea(app.selected.subId, app.selected.areaId)?.name ?? ''}
						subId={app.selected.subId}
						areaId={app.selected.areaId}
						onSelectScript={(subId, areaId, scenarioId, scriptId) => {
							app.selected = { kind: 'script', subId, areaId, scenarioId, scriptId };
							app.activeTab = 'anchors';
						}}
						onRun={() => {
							if (app.selected.kind === 'scenario') {
								const sc = getScenario(app.selected.subId, app.selected.areaId, app.selected.scenarioId);
								enqueueRuns(sc?.scripts.map((s) => s.id) ?? []);
							}
						}}
					/>
				{:else if app.selected.kind === 'area' && curArea}
					<AreaView
						area={curArea}
						subId={app.selected.subId}
						onSelectScenario={(subId, areaId, scenarioId) => {
							app.selected = { kind: 'scenario', subId, areaId, scenarioId };
						}}
						onRun={() => {
							if (app.selected.kind === 'area') {
								const a = getArea(app.selected.subId, app.selected.areaId);
								enqueueRuns(a?.scenarios.flatMap((s) => s.scripts.map((sc) => sc.id)) ?? []);
							}
						}}
					/>
				{/if}
			</div>

			<!-- inline chat/scores panel -->
			{#if app.openChat && openChatRun}
				<ChatDrawer run={openChatRun} model={openChatModel} onClose={() => (app.openChat = null)} />
			{/if}
		</div>

		<!-- right sidebar -->
		<RightSidebar
			{submissions}
			{runs}
			{app}
			onRunScript={(scriptId) => enqueueRuns([scriptId])}
			onRunScenario={(subId, areaId, scenarioId) => {
				const sc = getScenario(subId, areaId, scenarioId);
				enqueueRuns(sc?.scripts.map((s) => s.id) ?? []);
			}}
			onRunArea={(subId, areaId) => {
				const area = getArea(subId, areaId);
				enqueueRuns(area?.scenarios.flatMap((s) => s.scripts.map((sc) => sc.id)) ?? []);
			}}
		/>
	</div>
</div>

