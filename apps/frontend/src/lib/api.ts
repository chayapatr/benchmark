/**
 * api.ts — typed SSE client for the Hono backend
 */

import type { GenParams, SimParams, EvalParams } from './types.js';
import type {
	SseGenerateEvent,
	SseSimulateEvent,
	SseEvaluateEvent,
	GeneratedArea,
	Anchor,
	Metric,
	Message,
} from '@benchmark/types';

export type { SseGenerateEvent, SseSimulateEvent, SseEvaluateEvent, GeneratedArea };

export const API_BASE =
	typeof window !== 'undefined' && window.location.hostname !== 'localhost'
		? 'https://benchmark-production-2ae4.up.railway.app'
		: 'http://localhost:3001';

// ── Core SSE fetch helper ─────────────────────────────────────────────────────

async function* streamSSE<T>(url: string, body: unknown): AsyncGenerator<T> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
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
