import type { ReactNode } from "react";
import type { AIFeaturePlugin, EmailRecord, AIContext, AIPluginResult } from "../types";

export interface ActionItemsResult {
  items: ActionItem[];
}

export interface ActionItem {
  text: string;
  assignedToCurrentUser: boolean;
  dueDate: string | null; // ISO 8601 or null
  completed: boolean;
}

/**
 * Action Items — extracts tasks assigned to the current user from email body.
 *
 * Trigger: on-open — runs when the user opens a thread, on demand per session.
 * Results are cached in AIAnalysis; not re-extracted unless the prompt version changes.
 *
 * Status: STUB — `process` returns empty items list.
 * Full implementation: write a spec at specs/features/action-items-plugin.md
 */
const actionItemsPlugin: AIFeaturePlugin = {
  id: "action-items",
  displayName: "Action Items",
  description:
    "Extracts tasks and to-dos assigned to you from the email thread.",
  trigger: "on-open",

  async process(
    _email: EmailRecord,
    _context: AIContext,
  ): Promise<AIPluginResult> {
    // TODO:
    // 1. Decrypt email body via emailId (pass to lib/ai/email-ai.ts).
    // 2. Build prompt: instruct Claude to extract action items assigned to
    //    the user (identified by context.userId / their email address).
    // 3. Return structured ActionItem[].
    return {
      pluginId: "action-items",
      data: { items: [] } satisfies ActionItemsResult,
    };
  },

  renderResult(result: AIPluginResult): ReactNode {
    const data = result.data as unknown as ActionItemsResult;
    if (!data.items.length) return null;

    // TODO: Return an <ActionItemChecklist> Client Component.
    // Items should be checkable (optimistic UI; state persisted via PATCH /api/ai/action-items).
    return null;
  },
};

export default actionItemsPlugin;
