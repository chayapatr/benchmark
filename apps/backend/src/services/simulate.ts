/**
 * simulate.ts — Phase 2: Run a simulated conversation.
 *
 * Follows 2026-test methodology:
 *   - Simulator outputs "Thought: ...\nMessage: ..." (CoT); only Message enters history
 *   - Landmarks injected as per-turn instructions into the simulator's turn prompt
 *   - "terminate conversation" signal ends early
 *   - Full conversation history passed each turn (natural user/assistant roles)
 */

import { chat } from './llm.js';
import type { Anchor, Message, SimulateRequest, SseSimulateEvent } from '../types.js';

const TERMINATE_SIGNAL = 'terminate conversation';

// ── Landmark helpers ────────────────────────────────────────────────────────

/** Parse anchor turn string (e.g. "4", "4–5", "4-5") to a set of integers */
function parseTurns(turnStr: string): Set<number> {
  const cleaned = turnStr.replace('–', '-').trim();
  if (cleaned.includes('-')) {
    const [a, b] = cleaned.split('-').map(Number);
    const result = new Set<number>();
    for (let i = a; i <= b; i++) result.add(i);
    return result;
  }
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? new Set() : new Set([n]);
}

function getLandmarkForTurn(anchors: Anchor[], turn: number): string | null {
  for (const anchor of anchors) {
    if (parseTurns(anchor.turn).has(turn)) return anchor.instruction;
  }
  return null;
}


// ── Prompt builders ─────────────────────────────────────────────────────────

function buildSimulatorSystemPrompt(
  persona: string,
  goal: string,
  maxTurns: number
): string {
  return [
    'You are simulating a human user in a conversation with an AI assistant.',
    'You are NOT the AI — you are the human user.',
    '',
    'YOUR PERSONA:',
    persona,
    '',
    'YOUR GOAL:',
    goal,
    '',
    `This conversation will last at most ${maxTurns} turns.`,
    '',
    'OUTPUT FORMAT:',
    '  Thought: [brief reasoning about what to say next]',
    '  Message: [your message to the assistant]',
    '',
    'If the conversation has naturally concluded (goal achieved or no productive path forward),',
    `output exactly "${TERMINATE_SIGNAL}" as your Message.`,
  ].join('\n');
}

function buildFirstTurnPrompt(): string {
  return [
    'Begin the conversation. Write your opening message to the assistant.',
    '',
    'Consider:',
    '- Your goal and what you need from the assistant',
    '- How to open naturally — do not reveal everything at once',
    '- Your persona\'s communication style',
    '',
    'Output format:',
    '  Thought: [what you want to say and why]',
    '  Message: [your opening message]',
  ].join('\n');
}

function buildNextTurnPrompt(turn: number, maxTurns: number, landmark: string | null): string {
  const lines = [
    `Turn ${turn} of ${maxTurns}.`,
    'The assistant has responded. Write your next message.',
    '',
    'Consider:',
    '- What the assistant just said and how well it addressed your needs',
    '- What you still need to achieve your goal',
  ];
  if (landmark) {
    lines.push('', `INSTRUCTION FOR THIS TURN: ${landmark}`);
  }
  lines.push(
    '',
    'Output format:',
    '  Thought: [your reaction to the assistant\'s response and what to say next]',
    '  Message: [your next message]',
  );
  return lines.join('\n');
}

// ── CoT parser ──────────────────────────────────────────────────────────────

function parseMessage(raw: string): string | null {
  const match = raw.match(/^message:\s*(.+)/im);
  const content = match ? match[1].trim() : raw.trim();
  if (content.toLowerCase().startsWith(TERMINATE_SIGNAL)) return null;
  return content;
}

// ── Conversation runner ─────────────────────────────────────────────────────

export async function* simulateConversation(
  req: SimulateRequest
): AsyncGenerator<SseSimulateEvent> {
  const { simParams, anchors, modelId } = req;
  const { maxTurns, simulatorModelId, temperature } = simParams;

  const persona =
    req.userPersona ??
    `A person with the following context: ${req.scenarioDescription}`;
  const goal =
    req.userGoal ??
    req.scenarioDescription;
  const targetSystemPrompt =
    req.targetSystemPrompt ??
    'You are a helpful assistant.';

  const simulatorSys = buildSimulatorSystemPrompt(persona, goal, maxTurns);

  // history shared by both models (user/assistant alternating)
  const history: Message[] = [];
  const result: Message[] = [];
  let turnIndex = 0;

  try {
    for (let turn = 1; turn <= maxTurns; turn++) {
      // ── Simulator turn ────────────────────────────────────────────────────
      const landmark = getLandmarkForTurn(anchors, turn);
      const turnPrompt = turn === 1
        ? buildFirstTurnPrompt()
        : buildNextTurnPrompt(turn, maxTurns, landmark);

      const simulatorMessages: Message[] = [
        { role: 'system', content: simulatorSys },
        ...history,
        { role: 'user', content: turnPrompt },
      ];

      const rawSim = await chat(simulatorMessages, simulatorModelId, { temperature });
      const userContent = parseMessage(rawSim);

      if (userContent === null) break; // simulator ended conversation

      history.push({ role: 'user', content: userContent });
      result.push({ role: 'user', content: userContent });
      yield { type: 'turn', role: 'user', content: userContent, turnIndex: turnIndex++ };

      // ── Target model turn ─────────────────────────────────────────────────
      const targetMessages: Message[] = [
        { role: 'system', content: targetSystemPrompt },
        ...history,
      ];

      const assistantContent = await chat(targetMessages, modelId, { temperature });

      history.push({ role: 'assistant', content: assistantContent });
      result.push({ role: 'assistant', content: assistantContent });
      yield { type: 'turn', role: 'assistant', content: assistantContent, turnIndex: turnIndex++ };
    }

    yield { type: 'done', messages: result };
  } catch (err) {
    yield { type: 'error', message: String(err) };
  }
}
