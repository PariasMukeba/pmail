-- Add gen_random_uuid() defaults to all id columns so upserts without an
-- explicit id work correctly (INSERT path generates a UUID automatically;
-- UPDATE path leaves the existing id untouched since id is not in the SET list).
--
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/hfvbkhtlgfjlxkrjttxy/sql/new

ALTER TABLE "User"             ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Account"          ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "SyncState"        ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "CachedEmail"      ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Label"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Draft"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "PushSubscription" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
