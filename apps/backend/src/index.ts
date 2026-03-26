import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateRouter } from './routes/generate.js';
import { runsRouter } from './routes/runs.js';

const app = new Hono();

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (origin.startsWith('http://localhost')) return origin;
    if (origin.endsWith('.pages.dev')) return origin;
    if (origin === process.env.FRONTEND_ORIGIN) return origin;
    return null;
  },
}));

app.get('/health', (c) => c.json({ status: 'ok' }));

app.route('/api/generate', generateRouter);
app.route('/api/runs', runsRouter);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port });
console.log(`benchmark backend running on http://localhost:${port}`);
