-- CreateTable
CREATE TABLE "ProductNowOAuthSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payload" TEXT NOT NULL,

    CONSTRAINT "ProductNowOAuthSession_pkey" PRIMARY KEY ("id")
);
