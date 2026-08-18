-- CreateTable
CREATE TABLE "ResearchSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "researchBudget" INTEGER NOT NULL DEFAULT 0,
    "spent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researchSessionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT,
    "sourceType" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "retrievedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relevanceScore" REAL,
    "contentHash" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "purchaseId" TEXT,
    CONSTRAINT "Citation_researchSessionId_fkey" FOREIGN KEY ("researchSessionId") REFERENCES "ResearchSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaidResourceRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "researchSessionId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "serviceUrl" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relevanceScore" REAL,
    "expectedValue" TEXT NOT NULL,
    "alternative" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaidResourceRecommendation_researchSessionId_fkey" FOREIGN KEY ("researchSessionId") REFERENCES "ResearchSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT,
    "amount" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "agentAction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "researchSessionId" TEXT,
    CONSTRAINT "PaymentRecord_researchSessionId_fkey" FOREIGN KEY ("researchSessionId") REFERENCES "ResearchSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentRecord" ("agentAction", "amount", "asset", "createdAt", "decision", "id", "network", "receiver", "status", "transactionId") SELECT "agentAction", "amount", "asset", "createdAt", "decision", "id", "network", "receiver", "status", "transactionId" FROM "PaymentRecord";
DROP TABLE "PaymentRecord";
ALTER TABLE "new_PaymentRecord" RENAME TO "PaymentRecord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
