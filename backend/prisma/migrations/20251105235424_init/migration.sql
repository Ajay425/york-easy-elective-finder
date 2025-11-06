-- AlterTable
ALTER TABLE "Professor" ADD COLUMN     "avgDifficulty" DOUBLE PRECISION,
ADD COLUMN     "avgRating" DOUBLE PRECISION,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "numberOfRatings" INTEGER,
ADD COLUMN     "rateMyProfLink" TEXT,
ADD COLUMN     "wouldTakeAgainPercent" DOUBLE PRECISION;
