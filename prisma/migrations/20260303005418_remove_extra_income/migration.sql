/*
  Warnings:

  - You are about to drop the `ExtraIncome` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExtraIncome" DROP CONSTRAINT "ExtraIncome_configId_fkey";

-- DropTable
DROP TABLE "ExtraIncome";
