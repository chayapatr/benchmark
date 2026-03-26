/**
 * api.ts — typed SSE client for the Hono backend at localhost:3001
 *
 * All three endpoints stream Server-Sent Events.
 * Each generator yields typed event objects until a 'done' or 'error' event.
 */

import type { Anchor, Metric, Message, GenParams, SimParams, EvalParams } from './types.js';

export const API_BASE = 'http://localhost:3001';

// ── SSE event shapes (must match backend/src/types.ts) ────────────────────────

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
	| { type: 'done'; scores: Record<string, Record<string, { score: number; justification: string }>> }
	| { type: 'error'; message: string };

// ── Core SSE fetch helper ─────────────────────────────────────────────────────

async function* streamSSE<T>(url: string, body: unknown): AsyncGenerator<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		throw new Error(`Backend error ${res.status}: ${text}`);
	}
	if (!res.body) throw new Error('No response body');

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buf = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buf += decoder.decode(value, { stream: true });

			// SSE lines are separated by \n; events by \n\n
			const lines = buf.split('\n');
			buf = lines.pop() ?? '';

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const json = line.slice(6).trim();
					if (json) yield JSON.parse(json) as T;
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

// ── Public API ────────────────────────────────────────────────────────────────

export function streamGenerate(
	text: string,
	genParams: GenParams
): AsyncGenerator<SseGenerateEvent> {
	return streamSSE<SseGenerateEvent>(`${API_BASE}/api/generate`, { text, genParams });
}

export function streamSimulate(opts: {
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
	simParams: Pick<SimParams, 'simulatorModelId' | 'temperature' | 'maxTurns'>;
}): AsyncGenerator<SseSimulateEvent> {
	return streamSSE<SseSimulateEvent>(`${API_BASE}/api/runs/simulate`, opts);
}

export function streamEvaluate(opts: {
	runId: string;
	scenarioDescription: string;
	messages: Message[];
	metrics: Metric[];
	judgeModelIds: EvalParams['judgeModelIds'];
}): AsyncGenerator<SseEvaluateEvent> {
	return streamSSE<SseEvaluateEvent>(`${API_BASE}/api/runs/evaluate`, opts);
}
