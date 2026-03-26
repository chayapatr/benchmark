export type { Anchor, Message, Metric, JudgeScore } from '@benchmark/types';
// Re-export for convenience — no duplicate below

export type Script = { id: string; anchors: import('@benchmark/types').Anchor[]; validated: boolean };
export type Scenario = {
	id: string;
	name: string;
	description: string;
	userPersona?: string;
	userGoal?: string;
	targetSystemPrompt?: string;
	scripts: Script[];
	open: boolean;
	validated: boolean;
};
export type Area = { id: string; name: string; scenarios: Scenario[]; open: boolean; validated: boolean };

export type GenParams = {
	numScenarios: number;
	numScripts: number;
	/** "provider:model" format e.g. "openai:gpt-4o" */
	generatorModel: string;
};

export type Submission = {
	id: string;
	text: string;
	genParams: GenParams;
	metrics: import('@benchmark/types').Metric[];
	areas: Area[];
	open: boolean;
	generated: boolean;
	generating: boolean;
};

/** Display-only model metadata, derived from the provider:model ID */
export type Model = { id: string; name: string; provider: string };

export type RunStatus = 'idle' | 'running' | 'done' | 'error';

export type Run = {
	id: string;
	/** "provider:model" format */
	modelId: string;
	scriptId: string;
	round: number;
	version: number;
	status: RunStatus;
	progress: number;
	messages: import('@benchmark/types').Message[];
	/** scores[metricName][judgeModelId] = JudgeScore */
	scores: Record<string, Record<string, import('@benchmark/types').JudgeScore>>;
	variance: Record<string, number>;
};

/** Simulation parameters */
export type SimParams = {
	/** "provider:model" IDs to test */
	testedModelIds: string[];
	/** "provider:model" for the simulator */
	simulatorModelId: string;
	temperature: number;
	maxTurns: number;
	numRounds: number;
};

/** Evaluation parameters */
export type EvalParams = {
	/** "provider:model" judge IDs */
	judgeModelIds: string[];
	numRounds: number;
};

export type SelectedNode =
	| { kind: 'submission'; subId: string }
	| { kind: 'area'; subId: string; areaId: string }
	| { kind: 'scenario'; subId: string; areaId: string; scenarioId: string }
	| { kind: 'script'; subId: string; areaId: string; scenarioId: string; scriptId: string };

export type ActiveTab = 'anchors' | 'runs' | 'eval';

export type AppState = {
	selected: SelectedNode;
	activeTab: ActiveTab;
	openChat: string | null;
	renamingId: string | null;
	simParams: SimParams;
	evalParams: EvalParams;
};
