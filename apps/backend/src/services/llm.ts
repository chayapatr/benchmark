import OpenAI from 'openai';
import type { Message } from '../types.js';

const MAX_RETRIES = 5;

/** Map frontend short IDs → real model names */
const MODEL_ALIASES: Record<string, string> = {
  gpt4o: 'gpt-4o',
  gpt4omini: 'gpt-4o-mini',
  claude37: 'claude-3-7-sonnet-20250219',
  claude35: 'claude-3-5-sonnet-20241022',
  gemini2: 'gemini-2.0-flash',
  llama4: 'meta-llama/llama-4-maverick',
};

/** Route a model ID to the right OpenAI-compatible client + model string */
function makeClient(rawModelId: string): { client: OpenAI; model: string } {
  const modelId = MODEL_ALIASES[rawModelId] ?? rawModelId;
  const id = modelId.toLowerCase();

  if (id.startsWith('gpt-') || id.startsWith('o1') || id.startsWith('o3') || id.startsWith('o4')) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      model: modelId,
    };
  }

  if (id.startsWith('claude')) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY ?? process.env.ANTHROPIC_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      }),
      model: `anthropic/${modelId}`,
    };
  }

  if (id.startsWith('gemini')) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      }),
      model: `google/${modelId}`,
    };
  }

  if (id.startsWith('meta-llama') || id.startsWith('llama')) {
    return {
      client: new OpenAI({
        apiKey: process.env.DEEPINFRA_API_KEY,
        baseURL: 'https://api.deepinfra.com/v1/openai',
      }),
      model: modelId,
    };
  }

  // Default: OpenRouter handles everything else
  return {
    client: new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
    }),
    model: modelId,
  };
}

async function createWithRetry(
  client: OpenAI,
  params: Parameters<OpenAI['chat']['completions']['create']>[0]
): Promise<OpenAI.Chat.ChatCompletion> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await client.chat.completions.create(params) as OpenAI.Chat.ChatCompletion;
    } catch (err) {
      const msg = String(err);
      const isRetryable = /50[023]/.test(msg) || /rate.?limit/i.test(msg);
      if (isRetryable && attempt < MAX_RETRIES - 1) {
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
  const { client, model } = makeClient(modelId);
  const res = await createWithRetry(client, {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 1024,
  });
  return res.choices[0]?.message?.content ?? '';
}

/** Send messages and parse the response as JSON */
export async function chatJSON<T>(
  messages: Message[],
  modelId: string,
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const { client, model } = makeClient(modelId);
  const res = await createWithRetry(client, {
    model,
    messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 4096,
    response_format: { type: 'json_object' },
  });
  const text = res.choices[0]?.message?.content ?? '{}';
  return JSON.parse(text) as T;
}
