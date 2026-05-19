import { registerProvider, registerAIFeature } from "./registry";
import type { EmailProviderPlugin, AIFeaturePlugin } from "./types";

/**
 * Plugin manifest.
 *
 * Adding a plugin to Aire requires two things:
 * 1. Create the plugin file in `providers/` or `ai-features/`
 * 2. Add its name here
 *
 * We use explicit dynamic imports rather than filesystem scanning so that
 * Next.js's module bundler can statically analyse and tree-shake the imports.
 * Filesystem scanning (`fs.readdirSync`) does not work reliably after
 * Next.js compiles to a production bundle.
 */
const PROVIDER_IMPORTS: Record<string, () => Promise<{ default: EmailProviderPlugin }>> = {
  fastmail: () => import("./providers/fastmail"),
  protonmail: () => import("./providers/protonmail"),
};

const AI_FEATURE_IMPORTS: Record<string, () => Promise<{ default: AIFeaturePlugin }>> = {
  "meeting-extractor": () => import("./ai-features/meeting-extractor"),
  "action-items": () => import("./ai-features/action-items"),
  "tone-analyzer": () => import("./ai-features/tone-analyzer"),
};

let loaded = false;

/**
 * Load and register all plugins declared in the manifest.
 *
 * Idempotent — safe to call multiple times (no-ops after the first call).
 * Never throws — a failing plugin is logged and skipped so the rest of the
 * application starts normally.
 *
 * Call this once from `app/layout.tsx` (RSC) at startup:
 * ```ts
 * import { loadPlugins } from "@/lib/plugins/loader";
 * await loadPlugins();
 * ```
 *
 * @sideEffects mutates the plugin registry (module-level Maps)
 */
export async function loadPlugins(): Promise<void> {
  if (loaded) return;
  loaded = true;

  const providerCount = await loadGroup(
    PROVIDER_IMPORTS,
    (plugin) => registerProvider(plugin as EmailProviderPlugin),
    "provider",
  );

  const aiFeatureCount = await loadGroup(
    AI_FEATURE_IMPORTS,
    (plugin) => registerAIFeature(plugin as AIFeaturePlugin),
    "AI feature",
  );

  process.stdout.write(
    `[plugins] Loaded ${providerCount} email provider(s), ${aiFeatureCount} AI feature plugin(s)\n`,
  );
}

async function loadGroup(
  imports: Record<string, () => Promise<{ default: EmailProviderPlugin | AIFeaturePlugin }>>,
  register: (plugin: EmailProviderPlugin | AIFeaturePlugin) => void,
  kind: string,
): Promise<number> {
  let count = 0;

  for (const [name, importFn] of Object.entries(imports)) {
    try {
      const mod = await importFn();
      const plugin = mod.default;
      if (!plugin?.id) {
        throw new Error(`Plugin "${name}" has no default export with an "id" field`);
      }
      register(plugin);
      count++;
    } catch (err) {
      // Log the plugin name and error message, never any user data.
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[plugins] Failed to load ${kind} "${name}": ${msg}\n`);
    }
  }

  return count;
}
