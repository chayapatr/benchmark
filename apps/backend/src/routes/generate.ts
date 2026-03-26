import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { generateBenchmark } from '../services/generate.js';
import type { GenerateRequest } from '../types.js';

export const generateRouter = new Hono();

generateRouter.post('/', async (c) => {
  const body = await c.req.json<GenerateRequest>();

  if (!body.text?.trim()) {
    return c.json({ error: 'text is required' }, 400);
  }
  if (!body.genParams?.generatorModel) {
    return c.json({ error: 'genParams.generatorModel is required' }, 400);
  }

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (s) => {
    s.onAbort(() => s.close());

    for await (const event of generateBenchmark(body)) {
      await s.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'done' || event.type === 'error') break;
    }
  });
});
