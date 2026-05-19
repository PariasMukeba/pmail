export interface EmailForThreading {
  id: string;
  messageId: string | null;
  inReplyTo: string | null;
  /** Space-separated list of referenced message IDs, already split. */
  references: string[];
  subject: string | null;
  date: Date;
}

export interface ThreadGroup {
  /** Stable identifier for this thread (root message ID, or first email ID). */
  rootId: string;
  /** Ordered list of email IDs, oldest first. */
  emailIds: string[];
  subject: string | null;
}

/**
 * Group an array of emails into conversation threads.
 *
 * Strategy (in priority order):
 * 1. In-Reply-To header chain — direct parent linkage
 * 2. References header — full ancestry list
 * 3. Normalised subject fallback — for replies without proper headers
 *
 * @sideEffects none — pure function
 */
export function extractThreads(emails: EmailForThreading[]): ThreadGroup[] {
  if (emails.length === 0) return [];

  // ── Union-Find ─────────────────────────────────────────────────────────────
  // Each email is identified by its messageId if available, else its id.
  const key = (e: EmailForThreading) => e.messageId ?? e.id;

  const parent = new Map<string, string>();

  function find(id: string): string {
    if (!parent.has(id)) parent.set(id, id);
    const p = parent.get(id)!;
    if (p === id) return id;
    const root = find(p);
    parent.set(id, root); // path compression
    return root;
  }

  function union(a: string, b: string): void {
    // Always attach the newer root to the older root to keep earliest as root.
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Link by In-Reply-To and References headers.
  for (const email of emails) {
    const k = key(email);
    if (email.inReplyTo) union(k, email.inReplyTo);
    for (const ref of email.references) union(k, ref);
  }

  // ── Subject fallback ───────────────────────────────────────────────────────
  // Only applied to emails that still have no parent after header linking.
  const subjectToRoot = new Map<string, string>();

  for (const email of emails) {
    const normalised = normaliseSubject(email.subject);
    if (!normalised) continue;
    const k = key(email);
    if (find(k) === k) {
      // Email is currently a root — merge into subject group if one exists.
      if (subjectToRoot.has(normalised)) {
        union(k, subjectToRoot.get(normalised)!);
      } else {
        subjectToRoot.set(normalised, k);
      }
    }
  }

  // ── Collect groups ─────────────────────────────────────────────────────────
  const groups = new Map<string, EmailForThreading[]>();
  for (const email of emails) {
    const root = find(key(email));
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(email);
  }

  return Array.from(groups.entries()).map(([rootId, members]) => {
    const sorted = [...members].sort((a, b) => a.date.getTime() - b.date.getTime());
    return {
      rootId,
      emailIds: sorted.map((e) => e.id),
      subject: sorted[0]?.subject ?? null,
    };
  });
}

function normaliseSubject(subject: string | null): string | null {
  if (!subject) return null;
  return subject
    .replace(/^(re|fwd?|fw)\s*:\s*/gi, "")
    .toLowerCase()
    .trim() || null;
}
