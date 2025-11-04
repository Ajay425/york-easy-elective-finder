/*
  Warnings:

  - A unique constraint covering the columns `[firstname,lastname]` on the table `Professor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Professor_firstname_lastname_key" ON "Professor"("firstname", "lastname");
