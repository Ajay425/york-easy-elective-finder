import { DAY_LABELS } from "./courseFilters.js";

export const DAY_ORDER = ["M", "T", "W", "R", "F", "S", "U"];

const DAY_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(DAY_LABELS).map(([key, label]) => [String(label).toUpperCase(), key])
);

const DAY_ALIASES = {
  MON: "M",
  MONDAY: "M",
  TUE: "T",
  TUES: "T",
  TUESDAY: "T",
  WED: "W",
  WEDNESDAY: "W",
  TH: "R",
  THU: "R",
  THUR: "R",
  THURS: "R",
  THURSDAY: "R",
  SAT: "S",
  SATURDAY: "S",
  SUN: "U",
  SUNDAY: "U",
};

export function timeToMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function normalizeDayKey(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const upper = raw.toUpperCase();
  if (DAY_LABELS[upper]) return upper;
  if (DAY_LABEL_TO_KEY[upper]) return DAY_LABEL_TO_KEY[upper];
  return DAY_ALIASES[upper] || "";
}

function buildScheduleEntries(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const dayKey = normalizeDayKey(item?.dayOfWeek);
      const startMinutes = timeToMinutes(item?.startTime);
      let endMinutes = timeToMinutes(item?.endTime);

      if (endMinutes == null && startMinutes != null && Number(item?.durationMinutes) > 0) {
        endMinutes = startMinutes + Number(item.durationMinutes);
      }

      const hasValidTime =
        startMinutes != null &&
        endMinutes != null &&
        endMinutes > startMinutes;

      if (!dayKey && !hasValidTime) return null;

      return {
        dayKey,
        dayLabel: DAY_LABELS[dayKey] || dayKey,
        startMinutes: hasValidTime ? startMinutes : null,
        endMinutes: hasValidTime ? endMinutes : null,
        type: item?.type || null,
        catNumber: item?.catNumber || null,
      };
    })
    .filter(Boolean);
}

export function getScheduleEntries(offering) {
  const courseTimeEntries = buildScheduleEntries(offering?.courseTimes);
  if (courseTimeEntries.length > 0) return courseTimeEntries;
  return buildScheduleEntries(offering?.meetings);
}

export function getDayLabelsForOffering(offering) {
  const keys = new Set(
    getScheduleEntries(offering)
      .map((entry) => entry.dayKey)
      .filter(Boolean)
  );

  return DAY_ORDER
    .filter((key) => keys.has(key))
    .map((key) => DAY_LABELS[key] || key);
}

export function offeringMatchesDayTimeFilters(offering, { days = [], startTime = null, endTime = null } = {}) {
  const entries = getScheduleEntries(offering);
  const selectedDays = new Set(days.map(normalizeDayKey).filter(Boolean));
  const hasDayFilter = selectedDays.size > 0;
  const startBoundary = timeToMinutes(startTime);
  const endBoundary = timeToMinutes(endTime);
  const hasTimeFilter = startBoundary != null || endBoundary != null;

  if (hasDayFilter && !entries.some((entry) => selectedDays.has(entry.dayKey))) {
    return false;
  }

  if (!hasTimeFilter) return true;

  const timedEntries = entries.filter(
    (entry) => entry.startMinutes != null && entry.endMinutes != null
  );
  if (timedEntries.length === 0) return false;

  return timedEntries.every((entry) => {
    if (startBoundary != null && entry.startMinutes < startBoundary) return false;
    if (endBoundary != null && entry.endMinutes > endBoundary) return false;
    return true;
  });
}
