export type Message = { role: 'user' | 'assistant' | 'system'; content: string };

export type Anchor = { id: string; turn: string; instruction: string };

export type Metric = { id: string; name: string; description: string };

export type JudgeScore = { score: number; justification: string };

// ── Generate ───────────────────────────────────────────────────────────────────

export type GenerateRequest = {
  text: string;
  genParams: {
    numScenarios: number;
    numScripts: number;
    generatorModel: string;
  };
};

/** Richer scenario shape matching 2026-test design */
export type GeneratedScript = {
  anchors: Omit<Anchor, 'id'>[];
};

export type GeneratedScenario = {
  name: string;
  description: string;
  /** Who the simulator should roleplay as (2-4 sentences) */
  userPersona: string;
  /** What the simulated user is trying to achieve */
  userGoal: string;
  /** System prompt for the target model under test */
  targetSystemPrompt: string;
  scripts: GeneratedScript[];
};

export type GeneratedArea = { name: string; scenarios: GeneratedScenario[] };

export type GenerateResult = {
  areas: GeneratedArea[];
  metrics: Omit<Metric, 'id'>[];
};

// ── Simulate ───────────────────────────────────────────────────────────────────

export type SimulateRequest = {
  runId: string;
  submissionText: string;
  scenarioName: string;
  scenarioDescription: string;
  /** Optional: enriched fields from generation. Falls back to description-derived prompts. */
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

// ── Evaluate ───────────────────────────────────────────────────────────────────

export type EvaluateRequest = {
  runId: string;
  scenarioDescription: string;
  messages: Message[];
  metrics: Metric[];
  judgeModelIds: string[];
};

// ── SSE event shapes ──────────────────────────────────────────────────────────

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
