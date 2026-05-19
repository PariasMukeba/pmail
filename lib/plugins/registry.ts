import type { EmailProviderPlugin, AIFeaturePlugin } from "./types";

// Module-level Maps act as the registry. They are initialised once at startup
// by the loader and then read-only for the lifetime of the process.
const providers = new Map<string, EmailProviderPlugin>();
const aiFeatures = new Map<string, AIFeaturePlugin>();

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Register an email provider plugin.
 * Duplicate IDs are silently skipped — first registration wins.
 * This allows safe idempotent calls during hot reloads in development.
 */
export function registerProvider(plugin: EmailProviderPlugin): void {
  if (providers.has(plugin.id)) {
    process.stderr.write(
      `[plugins] Provider "${plugin.id}" already registered — skipping\n`,
    );
    return;
  }
  providers.set(plugin.id, plugin);
}

/**
 * Register an AI feature plugin.
 * Duplicate IDs are silently skipped — first registration wins.
 */
export function registerAIFeature(plugin: AIFeaturePlugin): void {
  if (aiFeatures.has(plugin.id)) {
    process.stderr.write(
      `[plugins] AI feature "${plugin.id}" already registered — skipping\n`,
    );
    return;
  }
  aiFeatures.set(plugin.id, plugin);
}

// ── Retrieval ─────────────────────────────────────────────────────────────────

/** Returns the provider plugin for the given ID, or undefined if not registered. */
export function getProvider(id: string): EmailProviderPlugin | undefined {
  return providers.get(id);
}

/** Returns all registered email provider plugins, in registration order. */
export function getAllProviders(): EmailProviderPlugin[] {
  return Array.from(providers.values());
}

/** Returns the AI feature plugin for the given ID, or undefined if not registered. */
export function getAIFeature(id: string): AIFeaturePlugin | undefined {
  return aiFeatures.get(id);
}

/** Returns all registered AI feature plugins, in registration order. */
export function getAllAIFeatures(): AIFeaturePlugin[] {
  return Array.from(aiFeatures.values());
}

/**
 * Returns AI feature plugins filtered by trigger type.
 * Used by the sync engine to find `on-receive` plugins and by the
 * reading pane to find `on-open` plugins.
 */
export function getAIFeaturesByTrigger(
  trigger: AIFeaturePlugin["trigger"],
): AIFeaturePlugin[] {
  return Array.from(aiFeatures.values()).filter((p) => p.trigger === trigger);
}

// ── Introspection (for logging and admin UI) ──────────────────────────────────

export function getRegisteredProviderIds(): string[] {
  return Array.from(providers.keys());
}

export function getRegisteredAIFeatureIds(): string[] {
  return Array.from(aiFeatures.keys());
}
