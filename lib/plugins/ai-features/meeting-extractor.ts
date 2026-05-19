import type { ReactNode } from "react";
import type { AIFeaturePlugin, EmailRecord, AIContext, AIPluginResult } from "../types";

export interface MeetingDetails {
  detected: boolean;
  date: string | null;       // ISO 8601 date string
  time: string | null;       // "3:00 PM" local
  duration: string | null;   // "1 hour", "30 minutes"
  participants: string[];    // display names or email addresses
  location: string | null;   // room name, address, or null
  videoLink: string | null;  // Zoom/Meet/Teams URL
  title: string | null;
}

/**
 * Meeting Extractor — detects meeting requests in emails and extracts
 * date, time, participants, location, and video link.
 *
 * Trigger: on-receive — runs automatically for every incoming email.
 * Skips emails that are clearly not meeting-related (fast heuristic check
 * before calling Claude).
 *
 * Status: STUB — `process` returns a non-detecting result.
 * Full implementation: write a spec at specs/features/meeting-extractor.md
 */
const meetingExtractorPlugin: AIFeaturePlugin = {
  id: "meeting-extractor",
  displayName: "Meeting Detector",
  description:
    "Detects meeting invites and requests. Extracts date, time, duration, participants, and video link.",
  trigger: "on-receive",

  async process(
    _email: EmailRecord,
    _context: AIContext,
  ): Promise<AIPluginResult> {
    // TODO:
    // 1. Fast heuristic: check if decrypted subject/body contains meeting keywords.
    //    Skip AI call if not (cost control).
    // 2. Call lib/ai/email-ai.ts → extractMeetingDetails(emailId)
    // 3. Parse and validate the Claude response with Zod.
    // 4. Return structured MeetingDetails.
    return {
      pluginId: "meeting-extractor",
      data: { detected: false } satisfies Pick<MeetingDetails, "detected">,
    };
  },

  renderResult(result: AIPluginResult): ReactNode {
    const data = result.data as unknown as MeetingDetails;
    if (!data.detected) return null;

    // TODO: Return a <MeetingCard> Client Component showing the extracted details.
    // The component should offer "Add to calendar" and "Copy video link" actions.
    return null;
  },
};

export default meetingExtractorPlugin;
