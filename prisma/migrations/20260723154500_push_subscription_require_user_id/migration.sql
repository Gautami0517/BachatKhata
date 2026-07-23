-- AlterTable: drop default so new rows must set authenticated userId
ALTER TABLE "push_subscriptions" ALTER COLUMN "userId" DROP DEFAULT;
