-- CreateTable
CREATE TABLE "ExtraIncome" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "ExtraIncome_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExtraIncome" ADD CONSTRAINT "ExtraIncome_configId_fkey" FOREIGN KEY ("configId") REFERENCES "Config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
