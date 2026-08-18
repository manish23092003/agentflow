-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentRecordId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resourceUrl" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "payTo" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "resolvedBy" TEXT,
    "resolutionReason" TEXT
);
INSERT INTO "new_ApprovalRequest" ("approvedAt", "id", "paymentRecordId", "requestedAt", "status") SELECT "approvedAt", "id", "paymentRecordId", "requestedAt", "status" FROM "ApprovalRequest";
DROP TABLE "ApprovalRequest";
ALTER TABLE "new_ApprovalRequest" RENAME TO "ApprovalRequest";
CREATE UNIQUE INDEX "ApprovalRequest_paymentRecordId_key" ON "ApprovalRequest"("paymentRecordId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
