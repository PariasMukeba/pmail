-- Pmail initial schema
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/hfvbkhtlgfjlxkrjttxy/sql

CREATE TABLE IF NOT EXISTS "User" (
    "id"            TEXT        NOT NULL,
    "name"          TEXT,
    "email"         TEXT        NOT NULL,
    "emailVerified" TIMESTAMPTZ,
    "image"         TEXT,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE TABLE IF NOT EXISTS "Account" (
    "id"                    TEXT        NOT NULL,
    "userId"                TEXT        NOT NULL,
    "type"                  TEXT        NOT NULL DEFAULT 'oauth',
    "provider"              TEXT        NOT NULL,
    "providerAccountId"     TEXT        NOT NULL,
    "access_token"          TEXT,
    "refresh_token"         TEXT,
    "expires_at"            INTEGER,
    "token_type"            TEXT,
    "scope"                 TEXT,
    "id_token"              TEXT,
    "session_state"         TEXT,
    "imapHost"              TEXT,
    "imapPort"              INTEGER,
    "smtpHost"              TEXT,
    "smtpPort"              INTEGER,
    "imapUser"              TEXT,
    "imapPasswordEncrypted" TEXT,
    "email"                 TEXT,
    "displayName"           TEXT,
    "color"                 TEXT        NOT NULL DEFAULT '#6366F1',
    "isActive"              BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

CREATE TABLE IF NOT EXISTS "SyncState" (
    "id"            TEXT        NOT NULL,
    "accountId"     TEXT        NOT NULL,
    "lastSyncedAt"  TIMESTAMPTZ,
    "nextPageToken" TEXT,
    "historyId"     TEXT,
    "deltaLink"     TEXT,
    "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SyncState_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SyncState_accountId_key" ON "SyncState"("accountId");

CREATE TABLE IF NOT EXISTS "CachedEmail" (
    "id"             TEXT        NOT NULL,
    "accountId"      TEXT        NOT NULL,
    "threadId"       TEXT        NOT NULL,
    "messageId"      TEXT        NOT NULL,
    "subject"        TEXT        NOT NULL DEFAULT '',
    "fromName"       TEXT        NOT NULL DEFAULT '',
    "fromAddress"    TEXT        NOT NULL DEFAULT '',
    "toAddresses"    TEXT        NOT NULL DEFAULT '[]',
    "ccAddresses"    TEXT        NOT NULL DEFAULT '[]',
    "preview"        TEXT        NOT NULL DEFAULT '',
    "bodyText"       TEXT,
    "bodyHtml"       TEXT,
    "rawMime"        TEXT,
    "date"           TIMESTAMPTZ NOT NULL,
    "receivedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "isRead"         BOOLEAN     NOT NULL DEFAULT false,
    "isStarred"      BOOLEAN     NOT NULL DEFAULT false,
    "isDraft"        BOOLEAN     NOT NULL DEFAULT false,
    "labels"         TEXT        NOT NULL DEFAULT '[]',
    "hasAttachments" BOOLEAN     NOT NULL DEFAULT false,
    "aiPriority"     TEXT        NOT NULL DEFAULT 'normal',
    "aiSummary"      TEXT,
    "aiActionItems"  TEXT,
    "inReplyTo"      TEXT,
    "references"     TEXT,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "CachedEmail_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CachedEmail_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CachedEmail_accountId_messageId_key" ON "CachedEmail"("accountId", "messageId");
CREATE INDEX IF NOT EXISTS "CachedEmail_accountId_date_idx"    ON "CachedEmail"("accountId", "date");
CREATE INDEX IF NOT EXISTS "CachedEmail_accountId_threadId_idx" ON "CachedEmail"("accountId", "threadId");
CREATE INDEX IF NOT EXISTS "CachedEmail_accountId_isRead_idx"  ON "CachedEmail"("accountId", "isRead");

CREATE TABLE IF NOT EXISTS "Label" (
    "id"        TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "accountId" TEXT,
    "name"      TEXT        NOT NULL,
    "color"     TEXT        NOT NULL DEFAULT '#6366F1',
    "syncedId"  TEXT,
    "isSystem"  BOOLEAN     NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Label_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Label_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")    ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Label_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Label_userId_accountId_name_key" ON "Label"("userId", "accountId", "name");

CREATE TABLE IF NOT EXISTS "Draft" (
    "id"              TEXT        NOT NULL,
    "accountId"       TEXT        NOT NULL,
    "userId"          TEXT        NOT NULL,
    "toAddresses"     TEXT        NOT NULL DEFAULT '[]',
    "ccAddresses"     TEXT        NOT NULL DEFAULT '[]',
    "bccAddresses"    TEXT        NOT NULL DEFAULT '[]',
    "subject"         TEXT        NOT NULL DEFAULT '',
    "body"            TEXT        NOT NULL DEFAULT '',
    "attachments"     TEXT        NOT NULL DEFAULT '[]',
    "providerDraftId" TEXT,
    "inReplyToId"     TEXT,
    "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Draft_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id"        TEXT        NOT NULL,
    "userId"    TEXT        NOT NULL,
    "endpoint"  TEXT        NOT NULL,
    "p256dh"    TEXT        NOT NULL,
    "auth"      TEXT        NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "PushSubscription_pkey"    PRIMARY KEY ("id"),
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
