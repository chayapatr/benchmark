import { Hono } from 'hono';
import { stream } from 'hono/streaming';
import { simulateConversation } from '../services/simulate.js';
import { evaluateRun } from '../services/evaluate.js';
import type { SimulateRequest, EvaluateRequest } from '../types.js';

export const runsRouter = new Hono();

/** POST /api/runs/simulate — stream a conversation via SSE */
runsRouter.post('/simulate', async (c) => {
  const body = await c.req.json<SimulateRequest>();

  if (!body.modelId) return c.json({ error: 'modelId is required' }, 400);
  if (!body.simParams?.simulatorModelId) return c.json({ error: 'simParams.simulatorModelId is required' }, 400);

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (s) => {
    s.onAbort(() => s.close());

    for await (const event of simulateConversation(body)) {
      await s.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'done' || event.type === 'error') break;
    }
  });
});

/** POST /api/runs/evaluate — stream evaluation scores via SSE */
runsRouter.post('/evaluate', async (c) => {
  const body = await c.req.json<EvaluateRequest>();

  if (!body.messages?.length) return c.json({ error: 'messages is required' }, 400);
  if (!body.metrics?.length) return c.json({ error: 'metrics is required' }, 400);
  if (!body.judgeModelIds?.length) return c.json({ error: 'judgeModelIds is required' }, 400);

  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  return stream(c, async (s) => {
    s.onAbort(() => s.close());

    for await (const event of evaluateRun(body)) {
      await s.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'done' || event.type === 'error') break;
    }
  });
});
