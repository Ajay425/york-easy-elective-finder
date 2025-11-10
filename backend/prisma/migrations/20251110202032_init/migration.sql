/*
  Warnings:

  - You are about to drop the column `fallPopularity` on the `Course` table. All the data in the column will be lost.
  - You are about to drop the column `winterPopularity` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "fallPopularity",
DROP COLUMN "winterPopularity";
