-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastLoginAt" DATETIME,
    CONSTRAINT "User_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "address" TEXT,
    "qualifications" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "performanceScore" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "categories" TEXT NOT NULL,
    "historicalScores" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProcurementRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "budget" DECIMAL NOT NULL,
    "startPrice" DECIMAL NOT NULL,
    "requiredQualifications" TEXT NOT NULL,
    "minSupplierLevel" TEXT NOT NULL,
    "deadline" DATETIME NOT NULL,
    "maxRounds" INTEGER NOT NULL DEFAULT 5,
    "minPriceDrop" REAL NOT NULL DEFAULT 0.02,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalSavings" DECIMAL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "biddingEndedAt" DATETIME,
    "awardedAt" DATETIME,
    "currentRoundNumber" INTEGER NOT NULL DEFAULT 0,
    "consecutiveNoBidRounds" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProcurementRequest_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BiddingRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lowestPrice" DECIMAL,
    "bidCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "BiddingRound_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "ProcurementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "rank" INTEGER,
    "anonymousName" TEXT NOT NULL,
    "priceDropPercent" REAL,
    CONSTRAINT "Bid_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "ProcurementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bid_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "BiddingRound" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Bid_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EvaluationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "finalPrice" DECIMAL NOT NULL,
    "priceScore" REAL NOT NULL,
    "historyScore" REAL NOT NULL,
    "totalScore" REAL NOT NULL,
    "rank" INTEGER NOT NULL,
    "isRecommended" BOOLEAN NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EvaluationResult_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "ProcurementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EvaluationResult_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approverRole" TEXT NOT NULL,
    "requiredRole" TEXT NOT NULL,
    "budgetOverrun" REAL NOT NULL,
    "decision" TEXT,
    "comment" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRecord_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "ProcurementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApprovalRecord_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "signedByBuyer" TEXT,
    "signedBySupplier" TEXT,
    "signedAt" DATETIME,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "ProcurementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FulfillmentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contractId" TEXT NOT NULL,
    "receiptNo" TEXT NOT NULL,
    "deliveredQuantity" REAL NOT NULL,
    "acceptedQuantity" REAL NOT NULL,
    "qualityScore" REAL NOT NULL,
    "deliveryDate" DATETIME NOT NULL,
    "performanceDelta" REAL NOT NULL,
    "inspectionReport" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FulfillmentRecord_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productName" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "safetyStockLevel" REAL NOT NULL,
    "lastUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "channels" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "totalProjects" INTEGER NOT NULL,
    "avgPriceDrop" REAL NOT NULL,
    "awardDeviationRate" REAL NOT NULL,
    "totalSavings" DECIMAL NOT NULL,
    "comparisonData" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filePath" TEXT
);

-- CreateTable
CREATE TABLE "_InvitedSuppliers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InvitedSuppliers_A_fkey" FOREIGN KEY ("A") REFERENCES "ProcurementRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InvitedSuppliers_B_fkey" FOREIGN KEY ("B") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_supplierId_idx" ON "User"("supplierId");

-- CreateIndex
CREATE INDEX "Supplier_level_status_idx" ON "Supplier"("level", "status");

-- CreateIndex
CREATE INDEX "Supplier_performanceScore_idx" ON "Supplier"("performanceScore");

-- CreateIndex
CREATE INDEX "ProcurementRequest_status_createdAt_idx" ON "ProcurementRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProcurementRequest_category_status_idx" ON "ProcurementRequest"("category", "status");

-- CreateIndex
CREATE INDEX "ProcurementRequest_createdBy_createdAt_idx" ON "ProcurementRequest"("createdBy", "createdAt");

-- CreateIndex
CREATE INDEX "BiddingRound_procurementId_roundNumber_idx" ON "BiddingRound"("procurementId", "roundNumber");

-- CreateIndex
CREATE INDEX "BiddingRound_status_endTime_idx" ON "BiddingRound"("status", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "BiddingRound_procurementId_roundNumber_key" ON "BiddingRound"("procurementId", "roundNumber");

-- CreateIndex
CREATE INDEX "Bid_procurementId_roundId_status_idx" ON "Bid"("procurementId", "roundId", "status");

-- CreateIndex
CREATE INDEX "Bid_supplierId_procurementId_idx" ON "Bid"("supplierId", "procurementId");

-- CreateIndex
CREATE INDEX "Bid_price_idx" ON "Bid"("price");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_procurementId_roundId_supplierId_key" ON "Bid"("procurementId", "roundId", "supplierId");

-- CreateIndex
CREATE INDEX "EvaluationResult_procurementId_rank_idx" ON "EvaluationResult"("procurementId", "rank");

-- CreateIndex
CREATE INDEX "EvaluationResult_supplierId_evaluatedAt_idx" ON "EvaluationResult"("supplierId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "ApprovalRecord_procurementId_createdAt_idx" ON "ApprovalRecord"("procurementId", "createdAt");

-- CreateIndex
CREATE INDEX "ApprovalRecord_approverId_decision_idx" ON "ApprovalRecord"("approverId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_procurementId_key" ON "Contract"("procurementId");

-- CreateIndex
CREATE INDEX "Contract_supplierId_status_idx" ON "Contract"("supplierId", "status");

-- CreateIndex
CREATE INDEX "Contract_status_createdAt_idx" ON "Contract"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FulfillmentRecord_contractId_deliveryDate_idx" ON "FulfillmentRecord"("contractId", "deliveryDate");

-- CreateIndex
CREATE INDEX "FulfillmentRecord_deliveryDate_idx" ON "FulfillmentRecord"("deliveryDate");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productCode_key" ON "Inventory"("productCode");

-- CreateIndex
CREATE INDEX "Inventory_productCode_idx" ON "Inventory"("productCode");

-- CreateIndex
CREATE INDEX "Inventory_category_idx" ON "Inventory"("category");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_userId_action_idx" ON "AuditLog"("userId", "action");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_idx" ON "AuditLog"("resource", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_level_timestamp_idx" ON "AuditLog"("level", "timestamp");

-- CreateIndex
CREATE INDEX "Notification_status_createdAt_idx" ON "Notification"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_month_key" ON "MonthlyReport"("month");

-- CreateIndex
CREATE INDEX "MonthlyReport_month_idx" ON "MonthlyReport"("month");

-- CreateIndex
CREATE UNIQUE INDEX "_InvitedSuppliers_AB_unique" ON "_InvitedSuppliers"("A", "B");

-- CreateIndex
CREATE INDEX "_InvitedSuppliers_B_index" ON "_InvitedSuppliers"("B");
