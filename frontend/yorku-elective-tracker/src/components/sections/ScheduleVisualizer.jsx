import { useMemo } from "react";
import { AlertTriangle, CalendarDays, Clock, FlaskConical } from "lucide-react";

const DAYS = [
  { key: "M", label: "Monday" },
  { key: "T", label: "Tuesday" },
  { key: "W", label: "Wednesday" },
  { key: "R", label: "Thursday" },
  { key: "F", label: "Friday" },
];

const DAY_KEYS = new Set(DAYS.map((day) => day.key));
const COLORS = [
  "border-purple-300/40 bg-purple-500/20 text-purple-50",
  "border-cyan-300/40 bg-cyan-500/20 text-cyan-50",
  "border-emerald-300/40 bg-emerald-500/20 text-emerald-50",
  "border-amber-300/40 bg-amber-500/20 text-amber-50",
  "border-pink-300/40 bg-pink-500/20 text-pink-50",
  "border-sky-300/40 bg-sky-500/20 text-sky-50",
];

function parseTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function formatMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function colorFor(value) {
  const hash = String(value || "").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

function findSavedCourse(courses, entry) {
  return courses.find((course) => course.code === entry.courseCode) || null;
}

function findSavedOffering(course, entry) {
  return course?.terms?.find((term) =>
    term.term === entry.term &&
    term.section === entry.section &&
    term.catNumber === entry.catNumber
  ) || null;
}

function buildSavedSections(courses, savedEntries) {
  return savedEntries.map((entry) => {
    const course = findSavedCourse(courses, entry);
    const offering = findSavedOffering(course, entry);

    return {
      entry,
      course,
      offering,
      isAvailable: Boolean(course && offering),
    };
  });
}

function buildScheduleBlocks(sections, selectedTerm) {
  const blocks = [];
  const unscheduled = [];

  for (const section of sections) {
    if (section.entry.term !== selectedTerm) continue;

    if (!section.isAvailable) {
      unscheduled.push({ ...section, reason: "This saved section is not in the current data." });
      continue;
    }

    const times = Array.isArray(section.offering?.courseTimes) ? section.offering.courseTimes : [];
    const weekdayTimes = times.filter((time) => DAY_KEYS.has(time.dayOfWeek));

    if (!weekdayTimes.length) {
      unscheduled.push({ ...section, reason: "No Monday-Friday time data is available for this saved section." });
      continue;
    }

    for (const time of weekdayTimes) {
      const start = parseTime(time.startTime);
      const end = parseTime(time.endTime) || (start == null ? null : start + (Number(time.durationMinutes) || 0));
      if (start == null || end == null || end <= start) {
        unscheduled.push({ ...section, reason: "This saved section has incomplete time data." });
        continue;
      }

      blocks.push({
        id: `${section.entry.id}|${time.dayOfWeek}|${time.type}|${time.startTime}|${time.endTime}`,
        entry: section.entry,
        course: section.course,
        offering: section.offering,
        day: time.dayOfWeek,
        type: time.type,
        start,
        end,
        startTime: time.startTime,
        endTime: time.endTime,
      });
    }
  }

  return { blocks, unscheduled };
}

function assignOverlapLanes(blocks) {
  const byDay = new Map();

  for (const block of blocks) {
    const dayBlocks = byDay.get(block.day) || [];
    dayBlocks.push(block);
    byDay.set(block.day, dayBlocks);
  }

  for (const dayBlocks of byDay.values()) {
    dayBlocks.sort((a, b) => a.start - b.start || a.end - b.end);

    for (const block of dayBlocks) {
      const overlapping = dayBlocks.filter((other) =>
        block.id !== other.id &&
        block.start < other.end &&
        block.end > other.start
      );
      block.conflictCount = overlapping.length;

      const usedLanes = new Set(overlapping.map((other) => other.lane).filter((lane) => lane != null));
      let lane = 0;
      while (usedLanes.has(lane)) lane += 1;
      block.lane = lane;
      block.lanes = Math.max(1, lane + 1, ...overlapping.map((other) => (other.lane ?? 0) + 1));

      for (const other of overlapping) {
        other.lanes = Math.max(other.lanes || 1, block.lanes);
      }
    }
  }

  return blocks;
}

function buildHourMarks(startMinute, endMinute) {
  const marks = [];
  const startHour = Math.floor(startMinute / 60);
  const endHour = Math.ceil(endMinute / 60);

  for (let hour = startHour; hour <= endHour; hour += 1) {
    marks.push(hour * 60);
  }

  return marks;
}

function shortLabel(value, maxLength = 18) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

export function ScheduleVisualizer({
  courses,
  savedEntries,
  selectedTerm,
  selectedTermLabel,
  onOpenCourse,
}) {
  const selectedTermName = selectedTermLabel || selectedTerm || "selected term";
  const selectedTermSavedCount = savedEntries.filter((entry) => entry.term === selectedTerm).length;
  const savedSections = useMemo(
    () => buildSavedSections(courses, savedEntries),
    [courses, savedEntries]
  );
  const { blocks, unscheduled } = useMemo(
    () => buildScheduleBlocks(savedSections, selectedTerm),
    [savedSections, selectedTerm]
  );
  const positionedBlocks = useMemo(() => assignOverlapLanes(blocks), [blocks]);
  const firstBlockStart = Math.min(...positionedBlocks.map((block) => block.start));
  const lastBlockEnd = Math.max(...positionedBlocks.map((block) => block.end));
  const timelineStart = Number.isFinite(firstBlockStart)
    ? Math.max(7 * 60, Math.floor(firstBlockStart / 60) * 60)
    : 8 * 60;
  const timelineEnd = Number.isFinite(lastBlockEnd)
    ? Math.min(23 * 60, Math.ceil(lastBlockEnd / 60) * 60)
    : 18 * 60;
  const totalMinutes = Math.max(60, timelineEnd - timelineStart);
  const hourMarks = buildHourMarks(timelineStart, timelineEnd);
  const rowHeight = 42;
  const timelineHeight = Math.max(320, (totalMinutes / 60) * rowHeight);

  if (!savedEntries.length) {
    return (
      <section className="relative z-10 w-full max-w-3xl px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <CalendarDays className="h-5 w-5 text-purple-200" />
        </div>
        <h2 className="text-xl font-semibold text-white">No saved sections to visualize</h2>
        <p className="mt-2 text-sm text-gray-400">
          Save CAT numbers first, then come back to build a weekly view.
        </p>
      </section>
    );
  }

  return (
    <section className="relative z-10 w-full max-w-6xl px-4 sm:px-6 pb-10">
      <div className="mb-4 rounded-lg border border-yellow-300/30 bg-yellow-300/10 p-3 text-left">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-yellow-200" />
          <div>
            <h2 className="text-base font-bold text-yellow-100">Beta schedule visualizer</h2>
            <p className="mt-1 text-xs text-yellow-50/85 sm:text-sm">
              This is a beta feature and may be buggy. Always double-check your saved CAT numbers and times in York's official tools before enrolling.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Saved Schedule</h3>
          <p className="text-xs text-gray-400 sm:text-sm">
            Showing saved {selectedTermName} sections on a Monday-Friday view.
          </p>
        </div>
      </div>

      {positionedBlocks.length > 0 ? (
        <>
        <div className="hidden overflow-hidden rounded-lg border border-white/10 bg-black/20 shadow-2xl shadow-black/30 md:block">
          <div>
            <div className="grid grid-cols-[58px_repeat(5,minmax(0,1fr))] border-b border-white/10 bg-white/[0.04]">
              <div className="px-2 py-2 text-[10px] font-semibold uppercase text-gray-500">Time</div>
              {DAYS.map((day) => (
                <div key={day.key} className="border-l border-white/10 px-2 py-2 text-center text-xs font-bold text-white lg:text-sm">
                  {day.label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[58px_repeat(5,minmax(0,1fr))]" style={{ height: `${timelineHeight}px` }}>
              <div className="relative border-r border-white/10 bg-white/[0.02]">
                {hourMarks.map((minute) => (
                  <div
                    key={minute}
                    className="absolute left-0 right-0 px-1.5 text-right text-[10px] text-gray-500"
                    style={{ top: `${((minute - timelineStart) / totalMinutes) * 100}%` }}
                  >
                    {formatMinutes(minute)}
                  </div>
                ))}
              </div>

              {DAYS.map((day) => {
                const dayBlocks = positionedBlocks.filter((block) => block.day === day.key);

                return (
                  <div key={day.key} className="relative border-l border-white/10">
                    {hourMarks.map((minute) => (
                      <div
                        key={minute}
                        className="absolute left-0 right-0 border-t border-white/5"
                        style={{ top: `${((minute - timelineStart) / totalMinutes) * 100}%` }}
                      />
                    ))}

                    {dayBlocks.map((block) => {
                      const width = 100 / (block.lanes || 1);
                      const left = width * (block.lane || 0);
                      const isConflict = block.conflictCount > 0;

                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => onOpenCourse(block.course, block.entry)}
                          title={`${block.entry.courseCode} · ${block.entry.courseTitle} · ${block.entry.catNumber}`}
                          className={`absolute overflow-hidden rounded-md border px-1.5 py-1 text-left shadow-md backdrop-blur transition hover:scale-[1.01] hover:shadow-purple-500/20 ${colorFor(block.entry.courseCode)} ${
                            isConflict ? "ring-1 ring-red-300/70" : ""
                          }`}
                          style={{
                            top: `${((block.start - timelineStart) / totalMinutes) * 100}%`,
                            height: `${Math.max(5, ((block.end - block.start) / totalMinutes) * 100)}%`,
                            left: `calc(${left}% + 3px)`,
                            width: `calc(${width}% - 6px)`,
                          }}
                        >
                          <p className="truncate text-[11px] font-bold leading-tight">
                            {block.entry.courseCode}
                          </p>
                          <p className="truncate text-[10px] leading-tight opacity-85">
                            Sec {block.entry.section} · {block.type}
                          </p>
                          {isConflict && (
                            <p className="mt-0.5 inline-flex items-center gap-1 rounded bg-red-500/25 px-1 py-0.5 text-[9px] font-bold text-red-50">
                              <AlertTriangle className="h-3 w-3" />
                              Conflict
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {DAYS.map((day) => {
            const dayBlocks = positionedBlocks
              .filter((block) => block.day === day.key)
              .sort((a, b) => a.start - b.start);

            return (
              <div key={day.key} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <h4 className="mb-2 text-sm font-bold text-white">{day.label}</h4>
                {dayBlocks.length ? (
                  <div className="space-y-2">
                    {dayBlocks.map((block) => {
                      const isConflict = block.conflictCount > 0;

                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => onOpenCourse(block.course, block.entry)}
                          className={`w-full rounded-md border px-3 py-2 text-left shadow-md ${colorFor(block.entry.courseCode)} ${
                            isConflict ? "ring-1 ring-red-300/70" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-bold">{block.entry.courseCode}</span>
                            <span className="shrink-0 rounded bg-black/25 px-1.5 py-0.5 text-[10px] font-bold">
                              {block.type}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs opacity-85">
                            {shortLabel(block.entry.courseTitle, 34)}
                          </p>
                          <p className="mt-1 truncate text-[11px] opacity-75">
                            {block.entry.catNumber} · Sec {block.entry.section}
                          </p>
                          {isConflict && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded bg-red-500/25 px-1.5 py-0.5 text-[10px] font-bold text-red-50">
                              <AlertTriangle className="h-3 w-3" />
                              Conflict
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No saved classes.</p>
                )}
              </div>
            );
          })}
        </div>
        </>
      ) : (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-6 py-12 text-center">
          <Clock className="mx-auto mb-4 h-8 w-8 text-gray-400" />
          <h3 className="text-lg font-semibold text-white">No weekday class times found</h3>
          <p className="mt-2 text-sm text-gray-400">
            {selectedTermSavedCount > 0
              ? `Saved ${selectedTermName} sections do not currently have Monday-Friday timing data.`
              : `You have not saved any ${selectedTermName} sections yet.`}
          </p>
        </div>
      )}

      {unscheduled.length > 0 && (
        <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-300">
            Saved sections not shown on the grid
          </h3>
          <div className="space-y-2">
            {unscheduled.map((item) => (
              <button
                key={item.entry.id}
                type="button"
                disabled={!item.isAvailable}
                onClick={() => item.isAvailable && onOpenCourse(item.course, item.entry)}
                className="flex w-full flex-col gap-1 rounded-lg border border-white/10 bg-black/20 p-3 text-left text-sm text-gray-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-semibold text-white">
                  {item.entry.courseCode} · {item.entry.catNumber}
                </span>
                <span className="text-xs text-gray-400">{item.reason}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default ScheduleVisualizer;
