-- CreateTable
CREATE TABLE "CaptureSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" TEXT NOT NULL,
    "capturedAt" DATETIME,
    "weightKg" REAL,
    "detectionsCount" INTEGER NOT NULL,
    "imageCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CalibrationRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "runId" TEXT NOT NULL,
    "createdAt" DATETIME,
    "rmsStereo" REAL,
    "notes" TEXT,
    "createdOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ServiceSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mqttConnected" BOOLEAN NOT NULL DEFAULT false,
    "bufferedCount" INTEGER NOT NULL,
    "lastCaptureAt" DATETIME,
    "stateDbExists" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "CameraConfigSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profile" TEXT NOT NULL,
    "updatedAt" DATETIME,
    "payload" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "CaptureSession_sessionId_key" ON "CaptureSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "CalibrationRun_runId_key" ON "CalibrationRun"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");
