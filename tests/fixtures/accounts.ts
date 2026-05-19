import { faker } from "@faker-js/faker";

export type Provider = "GMAIL" | "MICROSOFT" | "IMAP";

export interface PlainAccount {
  id: string;
  userId: string;
  provider: Provider;
  providerAccountId: string;
  emailAddress: string;
  displayName: string;
  scope: string;
  tokenExpiresAt: Date | null;
}

export function makeAccount(overrides: Partial<PlainAccount> = {}): PlainAccount {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    provider: "GMAIL",
    providerAccountId: faker.string.alphanumeric(21),
    emailAddress: faker.internet.email(),
    displayName: faker.person.fullName(),
    scope: "https://www.googleapis.com/auth/gmail.modify",
    tokenExpiresAt: faker.date.soon({ days: 1 }),
    ...overrides,
  };
}

export function makeGmailAccount(overrides: Partial<PlainAccount> = {}): PlainAccount {
  return makeAccount({
    provider: "GMAIL",
    emailAddress: faker.internet.email({ provider: "gmail.com" }),
    scope: "https://www.googleapis.com/auth/gmail.modify openid email",
    ...overrides,
  });
}

export function makeMicrosoftAccount(overrides: Partial<PlainAccount> = {}): PlainAccount {
  return makeAccount({
    provider: "MICROSOFT",
    emailAddress: faker.internet.email({ provider: "outlook.com" }),
    scope: "Mail.ReadWrite offline_access",
    ...overrides,
  });
}

export function makeExpiredAccount(overrides: Partial<PlainAccount> = {}): PlainAccount {
  return makeAccount({
    tokenExpiresAt: faker.date.past({ years: 1 }),
    ...overrides,
  });
}
