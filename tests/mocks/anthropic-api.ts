import { http, HttpResponse } from "msw";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";

/**
 * Build a non-streaming Anthropic messages response.
 * Pass `content` to control the text returned by the model.
 */
export function makeAnthropicResponse(content: string) {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    type: "message",
    role: "assistant",
    content: [{ type: "text", text: content }],
    model: "claude-sonnet-4-6",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 80 },
  };
}

/** Default summary JSON returned by the Anthropic mock. */
const DEFAULT_SUMMARY = JSON.stringify({
  summary: "A concise summary of the email thread.",
  actionItems: ["Reply by end of week"],
  sentiment: "NEUTRAL",
  category: "WORK",
});

/** Default priority response. */
const DEFAULT_PRIORITY = "normal";

export const anthropicHandlers = [
  http.post(ANTHROPIC_MESSAGES_URL, async ({ request }) => {
    const body = await request.json() as {
      system?: string | Array<{ type: string; text: string }>;
      messages?: Array<{ role: string; content: string }>;
      stream?: boolean;
    };

    // Detect which feature is calling based on system prompt content
    const systemText = Array.isArray(body.system)
      ? body.system.map((b) => (b as { text: string }).text).join(" ")
      : (body.system ?? "");

    const isPriorityCall = /priority/i.test(systemText);
    const isStreamingCall = body.stream === true;

    const responseContent = isPriorityCall ? DEFAULT_PRIORITY : DEFAULT_SUMMARY;

    if (isStreamingCall) {
      // Return SSE stream with a single content block delta
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const events = [
            `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: makeAnthropicResponse("") })}\n\n`,
            `event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })}\n\n`,
            `event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: responseContent } })}\n\n`,
            `event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`,
            `event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 80 } })}\n\n`,
            `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
          ];
          for (const event of events) {
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        },
      });

      return new HttpResponse(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    }

    return HttpResponse.json(makeAnthropicResponse(responseContent));
  }),
];
