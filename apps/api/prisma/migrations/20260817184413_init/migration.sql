-- CreateTable
CREATE TABLE "UserSpendingPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "maxPerTransaction" INTEGER NOT NULL,
    "dailyLimit" INTEGER NOT NULL,
    "allowedAssets" TEXT NOT NULL,
    "allowedNetworks" TEXT NOT NULL,
    "requireApprovalAbove" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transactionId" TEXT,
    "amount" INTEGER NOT NULL,
    "asset" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "agentAction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AgentSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentRecordId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSpendingPolicy_userId_key" ON "UserSpendingPolicy"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentSession_conversationId_key" ON "AgentSession"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_paymentRecordId_key" ON "ApprovalRequest"("paymentRecordId");
