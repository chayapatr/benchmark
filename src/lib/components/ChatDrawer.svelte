<script lang="ts">
	import type { Model, Run } from '$lib/types';

	let {
		run,
		model,
		onClose
	}: {
		run: Run;
		model: Model | undefined;
		onClose: () => void;
	} = $props();

	function scoreColor(v: number, variance: number) {
		if (variance > 0.08) return 'text-amber-600';
		if (v >= 0.85) return 'text-emerald-600';
		if (v >= 0.7) return 'text-sky-600';
		return 'text-red-500';
	}

	function avgScore(scores: Record<string, { score: number }> | undefined): number {
		if (!scores) return 0;
		const vals = Object.values(scores).map((j) => j.score);
		return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
	}
</script>

<div
	class="fixed inset-0 z-50 flex justify-end"
	style="font-family:'Menlo','Monaco','Consolas','Courier New',monospace;font-size:13px;"
>
	<button class="absolute inset-0 bg-black/30" onclick={onClose} aria-label="close"></button>
	<div class="relative flex h-full w-120 flex-col border-l border-zinc-200 bg-white">
		<!-- header -->
		<div class="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-2.5">
			<div>
				<span class="font-semibold text-zinc-800">{model?.name ?? run.modelId}</span>
				<span class="ml-2 text-zinc-400">round {run.round} · {run.scriptId}</span>
			</div>
			<button onclick={onClose} class="text-zinc-400 transition hover:text-zinc-700">✕</button>
		</div>

		<!-- messages -->
		<div class="flex-1 space-y-3 overflow-y-auto px-4 py-3">
			{#each run.messages as msg (msg.content + msg.role)}
				<div class="flex gap-2.5 {msg.role === 'user' ? 'flex-row-reverse' : ''}">
					<div
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs
						{msg.role === 'assistant' ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-200 text-zinc-600'}"
					>
						{msg.role === 'assistant' ? 'A' : 'U'}
					</div>
					<div
						class="max-w-[85%] rounded px-3 py-2 text-xs leading-relaxed
						{msg.role === 'assistant' ? 'bg-zinc-50 text-zinc-700' : 'bg-zinc-100 text-zinc-700'}"
					>
						{msg.content}
					</div>
				</div>
			{/each}
			{#if run.status === 'running'}
				<div class="flex gap-2.5">
					<div
						class="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-500"
					>
						A
					</div>
					<div class="flex gap-1 rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-400">
						<span class="animate-bounce" style="animation-delay:0ms">·</span>
						<span class="animate-bounce" style="animation-delay:100ms">·</span>
						<span class="animate-bounce" style="animation-delay:200ms">·</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- scores footer -->
		{#if run.status === 'done' && Object.keys(run.scores).length > 0}
			<div class="shrink-0 border-t border-zinc-200 px-4 py-3">
				<div class="mb-2 text-xs text-zinc-400">scores</div>
				<div class="space-y-2">
					{#each Object.entries(run.scores) as [metricName, judgeScores] (metricName)}
						{@const avg = avgScore(judgeScores)}
						{@const variance = run.variance[metricName] ?? 0}
						<div>
							<div class="mb-1 text-xs text-zinc-400">{metricName}</div>
							<div class="flex flex-wrap gap-3">
								<!-- avg -->
								<div>
									<div class="text-xs text-zinc-300">avg</div>
									<div class="font-semibold tabular-nums {scoreColor(avg, variance)}">
										{(avg * 100).toFixed(0)}%
									</div>
								</div>
								<!-- per judge -->
								{#each Object.entries(judgeScores) as [judgeId, js] (judgeId)}
									<div>
										<div class="text-xs text-zinc-300">{judgeId}</div>
										<div class="tabular-nums {scoreColor(js.score, 0)} text-xs">
											{(js.score * 100).toFixed(0)}%
										</div>
										{#if js.justification}
											<div class="max-w-48 text-xs text-zinc-400 italic">{js.justification}</div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>
