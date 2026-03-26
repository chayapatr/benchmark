# Benchmark

An LLM-as-judge benchmark platform for evaluating AI model behavior. Describe a deployment context, generate test scenarios, simulate user conversations, and score them with judge models — all from a single UI.

## Structure

```
apps/
  frontend/   SvelteKit 2 + Svelte 5 + Tailwind
  backend/    Hono.js + Node, streaming SSE API
packages/
  types/      Shared TypeScript types (request/response/event shapes)
```

## How it works

**Generate** — paste a deployment description (e.g. "mental health chatbot for university students"). The backend uses an LLM to produce areas → scenarios → scripts, each with anchor instructions that steer the simulated conversation at specific turns.

**Simulate** — for each script, a simulator model plays the user role while the target model plays the assistant. Conversations run turn-by-turn with CoT reasoning (`Thought: … / Message: …`) and terminate when the simulator signals completion.

**Evaluate** — one or more judge models score the finished conversation against each metric defined in the submission. Scores and justifications are streamed back live.

Results persist in `localStorage` across reloads.

## Model IDs

Models are specified as `provider:model`, e.g.:

| Provider | Example |
|----------|---------|
| `openai` | `openai:gpt-4o` |
| `anthropic` | `anthropic:claude-3-7-sonnet-20250219` |
| `deepinfra` | `deepinfra:meta-llama/llama-4-maverick` |

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate` | Stream benchmark generation (areas, scenarios, scripts, metrics) |
| `POST` | `/api/runs/simulate` | Stream a simulated conversation |
| `POST` | `/api/runs/evaluate` | Stream judge scores for a completed run |
| `GET`  | `/health` | Health check |

All endpoints stream [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events).

## Setup

```bash
pnpm install
```

Create `apps/backend/.env`:

```
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
DEEPINFRA_API_KEY=...
PORT=3001
```

## Dev

```bash
pnpm dev              # start both frontend + backend in parallel
pnpm dev:frontend     # frontend only  (http://localhost:5173)
pnpm dev:backend      # backend only   (http://localhost:3001)
```
