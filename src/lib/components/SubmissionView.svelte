<script lang="ts">
	import type { Submission } from '$lib/types';

	let {
		sub,
		generatorModels,
		onGenerate
	}: {
		sub: Submission;
		generatorModels: string[];
		onGenerate: (sub: Submission) => void;
	} = $props();
</script>

<div class="flex-1 space-y-5 overflow-y-auto px-5 py-4">
	<div class="text-xs text-zinc-400">submission</div>

	<textarea
		bind:value={sub.text}
		placeholder="Describe the deployment context and risks to benchmark…"
		rows="5"
		class="w-full resize-none rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none"
	></textarea>

	<!-- generation params -->
	<div class="space-y-2">
		<div class="text-xs text-zinc-400">generation</div>

		<div class="flex items-center justify-between">
			<span class="text-xs text-zinc-500">model</span>
			<select
				bind:value={sub.genParams.generatorModel}
				class="rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-zinc-500 focus:outline-none"
			>
				{#each generatorModels as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-xs text-zinc-500">scenarios per area</span>
			<div class="flex items-center overflow-hidden rounded border border-zinc-200">
				<button
					onclick={() => (sub.genParams.numScenarios = Math.max(1, sub.genParams.numScenarios - 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">−</button
				>
				<span class="w-6 border-x border-zinc-200 py-0.5 text-center text-xs text-zinc-700"
					>{sub.genParams.numScenarios}</span
				>
				<button
					onclick={() =>
						(sub.genParams.numScenarios = Math.min(10, sub.genParams.numScenarios + 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">+</button
				>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-xs text-zinc-500">scripts per scenario</span>
			<div class="flex items-center overflow-hidden rounded border border-zinc-200">
				<button
					onclick={() => (sub.genParams.numScripts = Math.max(1, sub.genParams.numScripts - 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">−</button
				>
				<span class="w-6 border-x border-zinc-200 py-0.5 text-center text-xs text-zinc-700"
					>{sub.genParams.numScripts}</span
				>
				<button
					onclick={() => (sub.genParams.numScripts = Math.min(10, sub.genParams.numScripts + 1))}
					class="px-1.5 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100">+</button
				>
			</div>
		</div>
	</div>

	<button
		onclick={() => onGenerate(sub)}
		disabled={!sub.text.trim() || sub.generating}
		class="flex items-center gap-2 rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 transition hover:border-zinc-500 hover:text-zinc-800 disabled:opacity-40"
	>
		{#if sub.generating}
			<span class="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent"
			></span>
			generating…
		{:else}
			{sub.generated ? 're-generate' : 'generate'}
		{/if}
	</button>

	<!-- metrics -->
	<div class="space-y-2">
		<div class="text-xs text-zinc-400">metrics</div>
		{#each sub.metrics as metric (metric.id)}
			<div class="group flex items-start gap-2">
				<div class="flex-1 space-y-1">
					<input
						bind:value={metric.name}
						placeholder="metric name"
						class="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none"
					/>
					<input
						bind:value={metric.description}
						placeholder="what should the judge evaluate…"
						class="w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-500 placeholder:text-zinc-300 focus:border-zinc-500 focus:outline-none"
					/>
				</div>
				<button
					onclick={() => (sub.metrics = sub.metrics.filter((m) => m.id !== metric.id))}
					class="mt-1 px-1 text-xs text-zinc-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
					>✕</button
				>
			</div>
		{/each}
		<button
			onclick={() => sub.metrics.push({ id: crypto.randomUUID(), name: '', description: '' })}
			class="text-xs text-zinc-400 transition hover:text-zinc-600">+ metric</button
		>
	</div>

	{#if sub.generated}
		<div class="border-t border-zinc-100 pt-4 text-xs text-zinc-400">
			{sub.areas.length} areas · {sub.areas.flatMap((a) => a.scenarios).length} scenarios · {sub.areas.flatMap(
				(a) => a.scenarios.flatMap((s) => s.scripts)
			).length} scripts
		</div>
	{/if}
</div>
