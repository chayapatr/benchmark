export type Anchor = { id: string; turn: string; instruction: string };
export type Script = { id: string; anchors: Anchor[]; validated: boolean };
export type Scenario = {
	id: string;
	name: string;
	description: string;
	scripts: Script[];
	open: boolean;
	validated: boolean;
};
export type Area = { id: string; name: string; scenarios: Scenario[]; open: boolean; validated: boolean };

export type GenParams = {
	numScenarios: number;
	numScripts: number;
	generatorModel: string;
};

export type Metric = { id: string; name: string; description: string };

export type Submission = {
	id: string;
	text: string;
	genParams: GenParams;
	metrics: Metric[];
	areas: Area[];
	open: boolean;
	generated: boolean;
	generating: boolean;
};

export type Model = { id: string; name: string; provider: string };

export type RunStatus = 'idle' | 'running' | 'done' | 'error';
export type Message = { role: 'user' | 'assistant'; content: string };

export type JudgeScore = {
	score: number;
	justification?: string;
};

export type Run = {
	id: string;
	/** Target model IDs that were tested — may be one or many */
	modelId: string;
	scriptId: string;
	round: number;
	/** Version counter: each re-run increments this, old runs are kept */
	version: number;
	status: RunStatus;
	progress: number;
	messages: Message[];
	/** scores[metricName][judgeModelId] = JudgeScore */
	scores: Record<string, Record<string, JudgeScore>>;
	variance: Record<string, number>;
};

/** Simulation (conversation) parameters */
export type SimParams = {
	/** Multiple target models to test */
	testedModelIds: string[];
	/** User/simulator model */
	simulatorModelId: string;
	temperature: number;
	maxTurns: number;
	numRounds: number;
};

/** Evaluation parameters */
export type EvalParams = {
	/** Multiple judge models — each run is evaluated by all selected judges */
	judgeModelIds: string[];
	numRounds: number;
};

export type SelectedNode =
	| { kind: 'submission'; subId: string }
	| { kind: 'area'; subId: string; areaId: string }
	| { kind: 'scenario'; subId: string; areaId: string; scenarioId: string }
	| { kind: 'script'; subId: string; areaId: string; scenarioId: string; scriptId: string };

export type ActiveTab = 'anchors' | 'runs' | 'eval';

/** Mutable shared UI state passed by reference to child components */
export type AppState = {
	selected: SelectedNode;
	activeTab: ActiveTab;
	openChat: string | null;
	renamingId: string | null;
	simParams: SimParams;
	evalParams: EvalParams;
};
