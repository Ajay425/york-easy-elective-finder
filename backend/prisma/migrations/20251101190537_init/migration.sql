-- CreateTable
CREATE TABLE "Professor" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);
