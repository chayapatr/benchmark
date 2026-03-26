// ── Base types ────────────────────────────────────────────────────────────────

export type Message = { role: 'user' | 'assistant' | 'system'; content: string };
export type Anchor = { id: string; turn: string; instruction: string };
export type Metric = { id: string; name: string; description: string };
export type JudgeScore = { score: number; justification: string };

// ── Generation types ──────────────────────────────────────────────────────────

export type GeneratedScript = { anchors: Omit<Anchor, 'id'>[] };
export type GeneratedScenario = {
  name: string;
  description: string;
  userPersona: string;
  userGoal: string;
  targetSystemPrompt: string;
  scripts: GeneratedScript[];
};
export type GeneratedArea = { name: string; scenarios: GeneratedScenario[] };
export type GenerateResult = {
  areas: GeneratedArea[];
  metrics: Omit<Metric, 'id'>[];
};

// ── Request types ─────────────────────────────────────────────────────────────

export type GenerateRequest = {
  text: string;
  genParams: {
    numScenarios: number;
    numScripts: number;
    generatorModel: string;
  };
};

export type SimulateRequest = {
  runId: string;
  submissionText: string;
  scenarioName: string;
  scenarioDescription: string;
  userPersona?: string;
  userGoal?: string;
  targetSystemPrompt?: string;
  anchors: Anchor[];
  modelId: string;
  round: number;
  simParams: {
    simulatorModelId: string;
    temperature: number;
    maxTurns: number;
  };
};

export type EvaluateRequest = {
  runId: string;
  scenarioDescription: string;
  messages: Message[];
  metrics: Metric[];
  judgeModelIds: string[];
};

// ── SSE event types ───────────────────────────────────────────────────────────

export type SseGenerateEvent =
  | { type: 'progress'; message: string }
  | { type: 'done'; areas: GeneratedArea[]; metrics: Omit<Metric, 'id'>[] }
  | { type: 'error'; message: string };

export type SseSimulateEvent =
  | { type: 'turn'; role: 'user' | 'assistant'; content: string; turnIndex: number }
  | { type: 'done'; messages: Message[] }
  | { type: 'error'; message: string };

export type SseEvaluateEvent =
  | { type: 'score'; metricName: string; judgeId: string; score: number; justification: string }
  | { type: 'done'; scores: Record<string, Record<string, JudgeScore>> }
  | { type: 'error'; message: string };
