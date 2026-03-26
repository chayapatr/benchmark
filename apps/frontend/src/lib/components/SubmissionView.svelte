<script lang="ts">
	import type { Submission } from '$lib/types';

	let {
		sub,
		onGenerate
	}: {
		sub: Submission;
		onGenerate: (sub: Submission) => void;
	} = $props();

	let totalScenarios = $derived(sub.areas.flatMap((a) => a.scenarios).length);
	let totalScripts = $derived(sub.areas.flatMap((a) => a.scenarios.flatMap((s) => s.scripts)).length);
	let totalAnchors = $derived(sub.areas.flatMap((a) => a.scenarios.flatMap((s) => s.scripts.flatMap((sc) => sc.anchors))).length);
</script>

<div class="flex-1 space-y-5 overflow-y-auto px-5 py-4">

	{#if sub.generated}
		<!-- locked view after generation -->
		<div class="flex items-center justify-between">
			<span class="text-xs font-medium text-zinc-600">System prompt</span>
			<span class="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600">generated</span>
		</div>

		<div class="rounded border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs leading-relaxed text-zinc-600">
			{sub.text}
		</div>

		<!-- generated summary -->
		<div class="space-y-2">
			<div class="text-xs font-semibold uppercase tracking-widest text-zinc-400">
				{sub.areas.length} area{sub.areas.length !== 1 ? 's' : ''} · {totalScenarios} scenario{totalScenarios !== 1 ? 's' : ''} · {totalScripts} script{totalScripts !== 1 ? 's' : ''}
			</div>

			<!-- areas breakdown -->
			<div class="space-y-1 pt-1">
				{#each sub.areas as area (area.id)}
					<div class="rounded border border-zinc-100 px-3 py-2">
						<div class="flex items-center justify-between">
							<span class="text-xs font-medium text-zinc-700">{area.name}</span>
							<span class="text-xs text-zinc-400">{area.scenarios.length} scenario{area.scenarios.length !== 1 ? 's' : ''}</span>
						</div>
						<div class="mt-1 space-y-0.5">
							{#each area.scenarios as sc (sc.id)}
								<div class="flex items-center gap-1.5 text-xs text-zinc-400">
									<span class="text-zinc-200">–</span>
									<span class="truncate">{sc.name}</span>
									<span class="shrink-0 text-zinc-200">{sc.scripts.length} script{sc.scripts.length !== 1 ? 's' : ''}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

	{:else}
		<!-- pre-generation: editable -->
		<div class="flex items-center justify-between">
			<span class="text-xs font-medium text-zinc-600">System prompt</span>
			<span class="text-xs text-zinc-400">e.g. mental health chatbot, customer support bot…</span>
		</div>

		<textarea
			bind:value={sub.text}
			placeholder="Describe the deployment context and risks to benchmark…"
			rows="5"
			class="w-full resize-none rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none"
		></textarea>

		<button
			onclick={() => onGenerate(sub)}
			disabled={!sub.text.trim() || sub.generating}
			class="flex items-center gap-2 rounded border border-zinc-400 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
		>
			{#if sub.generating}
				<span class="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent"></span>
				generating…
			{:else}
				generate
			{/if}
		</button>
	{/if}

	<!-- metrics (always visible) -->
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<span class="text-xs font-medium text-zinc-600">Eval metrics</span>
			{#if !sub.generated}
				<button
					onclick={() => sub.metrics.push({ id: crypto.randomUUID(), name: '', description: '' })}
					class="text-xs text-zinc-400 transition hover:text-zinc-600">+ add</button>
			{/if}
		</div>
		{#each sub.metrics as metric, i (metric.id)}
			<div class="group rounded border border-zinc-200 bg-zinc-50 px-3 py-2.5">
				<div class="mb-1.5 flex items-center gap-2">
					<span class="shrink-0 font-mono text-xs text-zinc-300">M{i + 1}</span>
					{#if sub.generated}
						<span class="flex-1 text-xs font-medium text-zinc-700">{metric.name}</span>
					{:else}
						<input
							bind:value={metric.name}
							placeholder="metric name"
							class="flex-1 bg-transparent text-xs font-medium text-zinc-700 placeholder:text-zinc-300 focus:outline-none"
						/>
						<button
							onclick={() => (sub.metrics = sub.metrics.filter((m) => m.id !== metric.id))}
							class="shrink-0 text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
							>✕</button>
					{/if}
				</div>
				{#if sub.generated}
					<p class="text-xs leading-relaxed text-zinc-400">{metric.description}</p>
				{:else}
					<textarea
						bind:value={metric.description}
						placeholder="what should the judge evaluate…"
						rows="2"
						class="w-full resize-none bg-transparent text-xs leading-relaxed text-zinc-500 placeholder:text-zinc-300 focus:outline-none"
					></textarea>
				{/if}
			</div>
		{/each}
		{#if sub.metrics.length === 0}
			<div class="py-2 text-xs text-zinc-300">no metrics yet</div>
		{/if}
	</div>
</div>
