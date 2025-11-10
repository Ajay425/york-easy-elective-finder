import { PrismaClient } from '../generated/prisma/index.js';

const prisma = new PrismaClient()

const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x))
const isMissing = (v) => v == null || v === -1

function normalizeRating(v) {
  if (isMissing(v) || v === 0) return null // 0 means “no reviews”
  return clamp((v - 1) / 4)
}

function normalizeDifficulty(v) {
  if (isMissing(v) || v === 0) return null
  return 1 - clamp((v - 1) / 4)
}

function normalizeWouldAgain(pct) {
  if (isMissing(pct)) return null
  return clamp(pct / 100)
}

function computePopularity(prof) {
  const hasRmpLink = !!(prof.rateMyProfLink && prof.rateMyProfLink.trim())
  if (!hasRmpLink) return 0

  const n = Math.max(0, prof.numberOfRatings ?? 0)

  // "Found but no reviews"
  const noReviews =
    (prof.avgRating === 0 || prof.avgRating == null || prof.avgRating === -1) &&
    (prof.avgDifficulty === 0 || prof.avgDifficulty == null || prof.avgDifficulty === -1) &&
    (prof.wouldTakeAgainPercent == null || prof.wouldTakeAgainPercent === -1) &&
    n === 0

  if (noReviews) return 0

  // Normalize values
  let ratingNorm = normalizeRating(prof.avgRating)
  let diffNorm = normalizeDifficulty(prof.avgDifficulty)
  let againNorm = normalizeWouldAgain(prof.wouldTakeAgainPercent)

  // If they have reviews but missing only "wouldTakeAgain", assume neutral 50%
  const hasSomeRatingData = ratingNorm !== null || diffNorm !== null
  const missingAgainOnly = againNorm === null && hasSomeRatingData && n > 0
  if (missingAgainOnly) againNorm = 0.5

  // Weighted mean of available features
  const parts = [
    [ratingNorm, 0.6],
    [againNorm, 0.3],
    [diffNorm, 0.1],
  ]
  const available = parts.filter(([v]) => v !== null)
  let quality
  if (available.length === 0) {
    quality = 0.5
  } else {
    const sumW = available.reduce((s, [, w]) => s + w, 0)
    quality = available.reduce((s, [v, w]) => s + v * (w / sumW), 0)
  }

  if (n === 0) return 0

  // Bayesian shrink toward 0.5
  const prior = 0.5
  const priorStrength = 10
  const qualityAdj = (priorStrength * prior + n * quality) / (priorStrength + n)

  return Math.round(100 * clamp(qualityAdj))
}

async function main() {
  const data = await prisma.instructors.findMany({
    select: {
      id: true,
      firstname: true,
      lastname: true,
      avgRating: true,
      avgDifficulty: true,
      wouldTakeAgainPercent: true,
      numberOfRatings: true,
      rateMyProfLink: true,
    },
  })

  for (const prof of data) {
    const popularity = computePopularity(prof)

    await prisma.instructors.update({
      where: { id: prof.id },
      data: { popularity },
    })

    console.log(
      `[${prof.id}] ${prof.firstname ?? ''} ${prof.lastname ?? ''} -> popularity ${popularity}`
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
