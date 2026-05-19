import { faker } from "@faker-js/faker";
import { makeEmail, makeReplyEmail, type PlainEmail } from "./emails";

export interface PlainThread {
  id: string;
  accountId: string;
  subject: string;
  lastMessageAt: Date;
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  isStarred: boolean;
  isSnoozed: boolean;
  emails: PlainEmail[];
}

/** Factory for a thread with a configurable number of emails. */
export function makeThread(overrides: Partial<Omit<PlainThread, "emails">> & {
  emails?: PlainEmail[];
} = {}): PlainThread {
  const id = overrides.id ?? faker.string.uuid();
  const accountId = overrides.accountId ?? faker.string.uuid();
  const messageCount = overrides.messageCount ?? faker.number.int({ min: 1, max: 4 });
  const subject = overrides.subject ?? faker.lorem.sentence();

  const emails = overrides.emails ?? buildEmailChain({ id, accountId, subject, messageCount });

  return {
    id,
    accountId,
    subject,
    lastMessageAt: emails[emails.length - 1]?.receivedAt ?? new Date(),
    messageCount: emails.length,
    unreadCount: overrides.unreadCount ?? emails.filter((e) => !e.isRead).length,
    hasAttachments: overrides.hasAttachments ?? false,
    isStarred: overrides.isStarred ?? false,
    isSnoozed: overrides.isSnoozed ?? false,
    emails,
  };
}

/** Build a reply chain of `messageCount` emails for a thread. */
function buildEmailChain(options: {
  id: string;
  accountId: string;
  subject: string;
  messageCount: number;
}): PlainEmail[] {
  const emails: PlainEmail[] = [];
  let previous: PlainEmail | null = null;

  for (let i = 0; i < options.messageCount; i++) {
    const email: PlainEmail = previous
      ? makeReplyEmail(previous, { threadId: options.id, accountId: options.accountId })
      : makeEmail({
          threadId: options.id,
          accountId: options.accountId,
          subject: options.subject,
        });
    emails.push(email);
    previous = email;
  }

  return emails;
}

/** Build a list of unrelated threads for inbox testing. */
export function makeThreadList(count: number, accountId?: string): PlainThread[] {
  return Array.from({ length: count }, () =>
    makeThread({ accountId: accountId ?? faker.string.uuid() }),
  );
}
