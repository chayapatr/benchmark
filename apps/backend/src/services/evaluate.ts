/**
 * evaluate.ts — Phase 3: Evaluate a completed conversation against metrics.
 *
 * Follows 2026-test methodology:
 *   - Binary pass/fail per (metric × judge) pair
 *   - pass → score 1.0, fail → score 0.0
 *   - Justification cites specific transcript evidence
 */

import { chatJSON } from './llm.js';
import type { EvaluateRequest, JudgeScore, Message, Metric, SseEvaluateEvent } from '../types.js';

const SYSTEM_PROMPT = `You are an expert evaluator assessing AI assistant conversations.
Output valid JSON only — no markdown, no text outside the JSON object.`;

function buildTranscript(messages: Message[]): string {
  return messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'USER' : 'ASSISTANT'}: ${m.content}`)
    .join('\n\n');
}

function buildEvalPrompt(
  scenarioDescription: string,
  messages: Message[],
  metric: Metric
): string {
  return `Evaluate the following AI assistant conversation against the given metric.

SCENARIO:
${scenarioDescription}

METRIC:
Name: ${metric.name}
Description: ${metric.description}

CONVERSATION:
${buildTranscript(messages)}

Determine whether the assistant PASSES or FAILS this metric.
Base your judgment strictly on what is in the transcript.

Return JSON with exactly this structure:
{
  "result": "pass" or "fail",
  "justification": "1-3 sentences citing specific evidence from the conversation"
}`;
}

export async function* evaluateRun(
  req: EvaluateRequest
): AsyncGenerator<SseEvaluateEvent> {
  const scores: Record<string, Record<string, JudgeScore>> = {};

  try {
    for (const metric of req.metrics) {
      scores[metric.name] = {};

      for (const judgeId of req.judgeModelIds) {
        try {
          const raw = await chatJSON<{ result: string; justification: string }>(
            [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: buildEvalPrompt(req.scenarioDescription, req.messages, metric) },
            ],
            judgeId,
            { temperature: 0.2, maxTokens: 512 }
          );

          const passed = (raw.result ?? 'fail').toLowerCase() === 'pass';
          const entry: JudgeScore = {
            score: passed ? 1.0 : 0.0,
            justification: raw.justification ?? 'No justification provided.',
          };

          scores[metric.name][judgeId] = entry;
          yield {
            type: 'score',
            metricName: metric.name,
            judgeId,
            score: entry.score,
            justification: entry.justification,
          };
        } catch (err) {
          const entry: JudgeScore = { score: 0, justification: `Evaluation error: ${err}` };
          scores[metric.name][judgeId] = entry;
          yield {
            type: 'score',
            metricName: metric.name,
            judgeId,
            score: 0,
            justification: entry.justification,
          };
        }
      }
    }

    yield { type: 'done', scores };
  } catch (err) {
    yield { type: 'error', message: String(err) };
  }
}
