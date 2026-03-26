import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { Message } from '../types.js';

const MAX_RETRIES = 5;

/**
 * Model ID format: "provider:model"
 *   openai:gpt-4o
 *   anthropic:claude-3-7-sonnet-20250219
 *   deepinfra:meta-llama/llama-4-maverick
 *
 * Legacy bare IDs (no colon) are routed by prefix for backwards compat.
 */
function parseModelId(fullId: string): { provider: string; model: string } {
  const idx = fullId.indexOf(':');
  if (idx !== -1) {
    return { provider: fullId.slice(0, idx), model: fullId.slice(idx + 1) };
  }
  // Legacy prefix routing
  const id = fullId.toLowerCase();
  if (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4')) {
    return { provider: 'openai', model: fullId };
  }
  if (id.startsWith('claude')) {
    return { provider: 'anthropic', model: fullId };
  }
  return { provider: 'deepinfra', model: fullId };
}

function makeOpenAIClient(provider: string): OpenAI {
  if (provider === 'deepinfra') {
    return new OpenAI({
      apiKey: process.env.DEEPINFRA_API_KEY,
      baseURL: 'https://api.deepinfra.com/v1/openai',
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err);
      const retryable = /50[023]/.test(msg) || /rate.?limit/i.test(msg);
      if (retryable && attempt < MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1) * 10));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

/** Send messages and get a text response */
export async function chat(
  messages: Message[],
  modelId: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { provider, model } = parseModelId(modelId);

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const system = messages.find(m => m.role === 'system')?.content;
    const msgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const res = await withRetry(() =>
      client.messages.create({
        model,
        system,
        messages: msgs,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.7,
      })
    );
    const block = res.content[0];
    return block?.type === 'text' ? block.text : '';
  }

  const client = makeOpenAIClient(provider);
  const res = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    }) as Promise<OpenAI.Chat.ChatCompletion>
  );
  return res.choices[0]?.message?.content ?? '';
}

/** Send messages and parse the response as JSON */
export async function chatJSON<T>(
  messages: Message[],
  modelId: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const { provider, model } = parseModelId(modelId);

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const system = messages.find(m => m.role === 'system')?.content;
    const msgs = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const res = await withRetry(() =>
      client.messages.create({
        model,
        system,
        messages: msgs,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
      })
    );
    const block = res.content[0];
    const text = block?.type === 'text' ? block.text : '{}';
    return JSON.parse(text) as T;
  }

  const client = makeOpenAIClient(provider);
  const res = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 4096,
      response_format: { type: 'json_object' },
    }) as Promise<OpenAI.Chat.ChatCompletion>
  );
  const text = res.choices[0]?.message?.content ?? '{}';
  return JSON.parse(text) as T;
}
