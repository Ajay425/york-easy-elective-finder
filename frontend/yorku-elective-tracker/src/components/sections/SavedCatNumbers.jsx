import { Bookmark, CalendarDays, Clock, Hash, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatSavedTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
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

export function SavedCatNumbers({
  courses,
  savedEntries,
  onOpenCourse,
  onRemove,
}) {
  const enrichedEntries = savedEntries.map((entry) => {
    const course = findSavedCourse(courses, entry);
    const offering = findSavedOffering(course, entry);

    return {
      ...entry,
      course,
      offering,
      isAvailable: Boolean(course && offering),
    };
  });

  if (!savedEntries.length) {
    return (
      <div className="relative z-10 w-full max-w-3xl px-6 py-14 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <Bookmark className="h-5 w-5 text-purple-200" />
        </div>
        <h2 className="text-xl font-semibold text-white">No saved CAT numbers</h2>
        <p className="mt-2 text-sm text-gray-400">
          Saved sections will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="relative z-10 w-full max-w-5xl px-6 sm:px-10 pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Saved CAT Numbers</h2>
          <p className="text-sm text-gray-400">{savedEntries.length} saved</p>
        </div>
      </div>

      <div className="space-y-3">
        {enrichedEntries.map((entry) => (
          <div
            key={entry.id}
            className="group flex flex-col gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/10 transition hover:border-purple-300/35 hover:bg-white/[0.07] sm:flex-row sm:items-center sm:justify-between"
          >
            <button
              type="button"
              disabled={!entry.isAvailable}
              onClick={() => entry.isAvailable && onOpenCourse(entry.course, entry)}
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent p-0 text-left hover:border-transparent disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-purple-300/30 bg-purple-400/10 px-2.5 py-1 font-mono text-sm font-bold text-purple-100">
                  <Hash className="h-3.5 w-3.5" />
                  {entry.catNumber}
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-gray-200">
                  {entry.termLabel || entry.term}
                </span>
                <span className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-gray-200">
                  Section {entry.section}
                </span>
                {!entry.isAvailable && (
                  <span className="rounded-md border border-yellow-300/30 bg-yellow-300/10 px-2.5 py-1 text-xs font-semibold text-yellow-100">
                    Not in current data
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">
                  {entry.courseCode}
                  <span className="font-normal text-gray-300"> · {entry.courseTitle}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                  {entry.termAndYear && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {entry.termAndYear}
                    </span>
                  )}
                  {entry.savedAt && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Saved {formatSavedTime(entry.savedAt)}
                    </span>
                  )}
                </div>
              </div>
            </button>

            <Button
              type="button"
              aria-label={`Remove ${entry.catNumber}`}
              onClick={() => onRemove(entry.id)}
              className="h-10 w-10 shrink-0 rounded-lg border border-white/10 bg-white/5 p-0 text-gray-300 hover:border-red-300/40 hover:bg-red-500/15 hover:text-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SavedCatNumbers;
