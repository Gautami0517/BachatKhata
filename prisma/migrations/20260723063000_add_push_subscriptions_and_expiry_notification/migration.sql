-- AlterTable
ALTER TABLE "coupons" ADD COLUMN "expiryNotificationSentAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "coupons_expiryNotificationSentAt_idx" ON "coupons"("expiryNotificationSentAt");

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXPIRY', 'RECOMMENDATION', 'SYSTEM');

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");
