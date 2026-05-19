import type { ReactNode } from "react";
import type { AIFeaturePlugin, EmailRecord, AIContext, AIPluginResult } from "../types";

export type ToneLabel = "Professional" | "Casual" | "Aggressive" | "Unclear";

export interface ToneAnalysisResult {
  tone: ToneLabel;
  /** 0.0–1.0 confidence score for the detected tone. */
  confidence: number;
  /** 1–2 sentence explanation of why this tone was detected. */
  explanation: string;
  /** Optional 1-sentence rewrite suggestion if tone is Aggressive or Unclear. */
  suggestion: string | null;
}

/**
 * Tone Analyzer — analyses the tone of a draft before sending.
 *
 * Trigger: on-demand — activated by a "Check Tone" button in the compose window.
 * Takes the draft body (not a stored email) as input; results are ephemeral
 * (not stored in AIAnalysis).
 *
 * Status: STUB — `process` returns a placeholder result.
 * Full implementation: write a spec at specs/features/tone-analyzer-plugin.md
 *
 * Note: this plugin receives the draft body, not a stored email record.
 * The `email` parameter is used here to provide structural compatibility with
 * the plugin interface; in practice the compose window calls this with a
 * synthetic EmailRecord whose body fields are the current draft content.
 */
const toneAnalyzerPlugin: AIFeaturePlugin = {
  id: "tone-analyzer",
  displayName: "Tone Analyzer",
  description:
    "Analyses the tone of your draft before sending: Professional, Casual, Aggressive, or Unclear.",
  trigger: "on-demand",

  async process(
    _email: EmailRecord,
    _context: AIContext,
  ): Promise<AIPluginResult> {
    // TODO:
    // 1. Accept the draft body text (passed via context or a special field).
    // 2. Build a tone-analysis prompt in lib/ai/prompts/tone-analyze.ts.
    // 3. Call lib/ai/email-ai.ts → analyzeTone(draftText).
    // 4. Parse response into ToneAnalysisResult with Zod.
    return {
      pluginId: "tone-analyzer",
      data: {
        tone: "Professional",
        confidence: 0,
        explanation: "Not yet implemented.",
        suggestion: null,
      } satisfies ToneAnalysisResult,
    };
  },

  renderResult(result: AIPluginResult): ReactNode {
    void result.data; // stub — ToneMeter component not yet implemented
    return null;
  },
};

// Suppress unused variable warning in stub
export default toneAnalyzerPlugin;
