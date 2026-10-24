-- Better Auth identifies account records by provider and account ID.
DROP INDEX "account_issuer_accountId_key";

ALTER TABLE "account" DROP COLUMN "issuer";

CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
