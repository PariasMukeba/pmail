export interface EmailAddress {
  name: string;
  address: string;
}

export interface Email {
  id: string;
  threadId: string;
  accountId: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  preview: string;
  body: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  hasAttachments: boolean;
  aiPriority: "high" | "normal" | "low";
  aiSummary: string | null;
  isDraft: boolean;
}

export interface Thread {
  id: string;
  accountId: string;
  subject: string;
  messages: Email[];
  participants: EmailAddress[];
  lastMessageDate: Date;
  isRead: boolean;
  isStarred: boolean;
  labels: string[];
  messageCount: number;
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  provider: "gmail" | "office365" | "imap";
  email: string;
  displayName: string;
  color: string;
  isActive: boolean;
}

export interface EmailLabel {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  accountId?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export type ReplyTone = "professional" | "friendly" | "brief";
export type EmailDensity = "comfortable" | "compact" | "ultra";
export type ReadingPanePosition = "right" | "bottom" | "off";
export type NotificationLevel = "all" | "priority" | "none";

export interface UserPreferences {
  theme: "dark" | "light" | "system";
  density: EmailDensity;
  readingPane: ReadingPanePosition;
  previewLines: 0 | 1 | 2;
  fontSize: "small" | "medium" | "large";
  conversationView: boolean;
  notifications: NotificationLevel;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}
