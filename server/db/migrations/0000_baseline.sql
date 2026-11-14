-- Baseline for the Drizzle migration history. Databases created by the former
-- Prisma migrations already contain these objects, so every statement is
-- idempotent: fresh databases get the full schema, existing ones are left
-- untouched. New migrations come from `bun run db:generate` as usual.
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false NOT NULL,
	"banReason" text,
	"banExpires" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"impersonatedBy" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp (3),
	"refreshTokenExpiresAt" timestamp (3),
	"scope" text,
	"password" text,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp (3) NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"dueDate" timestamp (3),
	"createdAt" timestamp (3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "account_providerId_accountId_key" ON "account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dev_task_status_idx" ON "dev_task" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "session_token_key" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_key" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_name_idx" ON "user" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_createdAt_idx" ON "user" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" USING btree ("identifier");
