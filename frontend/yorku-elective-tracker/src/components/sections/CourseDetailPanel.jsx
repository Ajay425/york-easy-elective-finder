import { motion } from "framer-motion";
import { ChevronDown, X, Copy, Check, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { getCatEntryId } from "../../hooks/useSavedCatNumbers";
import { useSeats, getOpenSeats, formatSeatTimestamp } from "../../hooks/useSeats";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MotionDiv = motion.div;

const DAY_LABELS = {
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  R: "Thursday",
  Th: "Thursday",
  F: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const TYPE_LABELS = {
  LECT: "Lecture",
  TUTR: "Tutorial",
  LAB: "Lab",
  SEM: "Seminar",
  SEMR: "Seminar",
  BLEN: "Blended",
  ONLN: "Online",
  ONCA: "Online Async",
  HYFX: "Hybrid",
};

const COURSE_TYPE_ORDER = [
  "LECT",
  "SEMR",
  "SEM",
  "TUTR",
  "LAB",
  "BLEN",
  "ONLN",
  "ONCA",
  "HYFX",
];

const TERM_LABELS = {
  F: "Fall",
  W: "Winter",
  Y: "Full Year",
  M: "Full Year",
  N: "Fall/Winter",
  A: "Summer",
  B: "Summer First Half",
  C: "Summer Second Half",
  S1: "Summer First Half",
  S2: "Summer Second Half",
  S3: "Summer Full",
  SU: "Summer",
};

const PRIMARY_TIME_TYPES = new Set(["LECT", "SEMR", "SEM", "BLEN", "ONLN", "ONCA", "HYFX"]);

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.MAX_SAFE_INTEGER;
  return hours * 60 + minutes;
}

function sortTimes(times) {
  const dayOrder = { M: 1, T: 2, W: 3, R: 4, Th: 4, F: 5, S: 6, Sat: 6, U: 7, Sun: 7 };
  return [...times].sort((a, b) => {
    const dayDiff = (dayOrder[a.dayOfWeek] || 99) - (dayOrder[b.dayOfWeek] || 99);
    if (dayDiff !== 0) return dayDiff;
    const timeDiff = minutesFromTime(a.startTime) - minutesFromTime(b.startTime);
    if (timeDiff !== 0) return timeDiff;
    return String(a.type || "").localeCompare(String(b.type || ""));
  });
}

function splitTimesByRole(times) {
  const sorted = sortTimes(Array.isArray(times) ? times : []);
  return {
    primary: sorted.filter((time) => PRIMARY_TIME_TYPES.has(time.type)),
    tutorials: sorted.filter((time) => time.type === "TUTR"),
    labs: sorted.filter((time) => time.type === "LAB"),
    other: sorted.filter((time) =>
      !PRIMARY_TIME_TYPES.has(time.type) && time.type !== "TUTR" && time.type !== "LAB"
    ),
  };
}

function groupOfferingKey(offering) {
  return [offering?.term, offering?.section].map((part) => String(part || "").trim()).join("|");
}

function offeringIdentity(offering) {
  return [offering?.term, offering?.section, offering?.catNumber]
    .map((part) => String(part || "").trim())
    .join("|");
}

function catSelectValue(offering, index) {
  return offering?.catNumber || `option-${index}`;
}

function shortTimeSummary(offering) {
  const times = sortTimes(Array.isArray(offering?.courseTimes) ? offering.courseTimes : []);
  const selected = times.find((time) => time.catNumber === offering?.catNumber) || times.find((time) => time.type === "LAB") || times[0];
  if (!selected) return "";

  const day = DAY_LABELS[selected.dayOfWeek] || selected.dayOfWeek;
  const type = selected.type ? `${selected.type} ` : "";
  return `${type}${day} ${selected.startTime}${selected.endTime ? `-${selected.endTime}` : ""}`;
}

function termLabel(term, selectedTerm, selectedTermLabel) {
  if (term === selectedTerm && selectedTermLabel) return selectedTermLabel;
  return TERM_LABELS[term] || term || "Unknown term";
}

function summarizeTypes(offerings) {
  const types = new Set();
  offerings.forEach((offering) => {
    offering.meetings?.forEach((meeting) => {
      if (meeting?.type) types.add(TYPE_LABELS[meeting.type] || meeting.type);
    });
  });
  return Array.from(types).slice(0, 3).join(" + ") || "Meeting info TBA";
}

function summarizeCats(offerings) {
  const cats = Array.from(new Set(offerings.map((offering) => offering.catNumber).filter(Boolean)));
  if (cats.length === 0) return "No CAT listed";
  if (cats.length === 1) return `CAT ${cats[0]}`;
  return `${cats.length} CAT options`;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s]|_/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanInstructorName(firstName, lastName) {
  const first = String(firstName || "").trim();
  const last = String(lastName || "").trim();
  const isTba = !first || first.toUpperCase() === "TBA";

  return {
    firstName: isTba ? "TBA" : first,
    lastName: isTba ? "" : last,
    displayName: isTba ? "TBA" : `${first} ${last}`.trim(),
    isTba,
  };
}

function instructorKey(meeting) {
  const name = cleanInstructorName(meeting?.firstName, meeting?.lastName);
  if (name.isTba) return "tba";
  return `${normalizeName(name.firstName)}|${normalizeName(name.lastName)}`;
}

function roleRank(type) {
  const index = COURSE_TYPE_ORDER.indexOf(type);
  return index === -1 ? 999 : index;
}

function compareRoles(a, b) {
  const typeDiff = roleRank(a?.type) - roleRank(b?.type);
  if (typeDiff !== 0) return typeDiff;

  const componentDiff = String(a?.componentNumber || "").localeCompare(String(b?.componentNumber || ""), undefined, { numeric: true });
  if (componentDiff !== 0) return componentDiff;

  return String(a?.catNumber || "").localeCompare(String(b?.catNumber || ""), undefined, { numeric: true });
}

function roleLabel(role) {
  const label = TYPE_LABELS[role?.type] || role?.type || "Meeting";
  return role?.componentNumber ? `${label} ${role.componentNumber}` : label;
}

function profileScore(meeting) {
  return [
    meeting?.rateMyProfLink ? 1 : 0,
    Number(meeting?.popularity) || 0,
    Number(meeting?.numberOfRatings) || 0,
    Number(meeting?.avgRating) || 0,
  ];
}

function compareScores(a, b) {
  for (let index = 0; index < a.length; index++) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function buildInstructorGroups(meetings) {
  const groups = new Map();

  (Array.isArray(meetings) ? meetings : []).forEach((meeting) => {
    const name = cleanInstructorName(meeting?.firstName, meeting?.lastName);
    const key = instructorKey(meeting);

    if (!groups.has(key)) {
      groups.set(key, {
        firstName: name.firstName,
        lastName: name.lastName,
        displayName: name.displayName,
        isTba: name.isTba,
        avgRating: null,
        avgDifficulty: null,
        wouldTakeAgainPercent: null,
        numberOfRatings: null,
        rateMyProfLink: null,
        popularity: 0,
        roles: [],
        roleKeys: new Set(),
        score: [0, 0, 0, 0],
      });
    }

    const group = groups.get(key);
    const score = profileScore(meeting);
    if (compareScores(score, group.score) > 0) {
      group.avgRating = meeting?.avgRating ?? null;
      group.avgDifficulty = meeting?.avgDifficulty ?? null;
      group.wouldTakeAgainPercent = meeting?.wouldTakeAgainPercent ?? null;
      group.numberOfRatings = meeting?.numberOfRatings ?? null;
      group.rateMyProfLink = meeting?.rateMyProfLink || null;
      group.score = score;
    }

    group.popularity = Math.max(group.popularity, Number(meeting?.popularity) || 0);

    const role = {
      type: meeting?.type || null,
      componentNumber: meeting?.componentNumber || null,
      rawType: meeting?.rawType || null,
      catNumber: meeting?.catNumber || null,
    };
    const roleKey = [role.type || "", role.componentNumber || "", role.rawType || "", role.catNumber || ""].join("|");
    if (!group.roleKeys.has(roleKey)) {
      group.roleKeys.add(roleKey);
      group.roles.push(role);
    }
  });

  return Array.from(groups.values())
    .map((group) => {
      const publicGroup = {
        ...group,
        roles: [...group.roles].sort(compareRoles),
      };
      delete publicGroup.roleKeys;
      delete publicGroup.score;
      return publicGroup;
    })
    .sort((a, b) => {
      if (a.isTba !== b.isTba) return a.isTba ? 1 : -1;

      const roleDiff = compareRoles(a.roles[0] || {}, b.roles[0] || {});
      if (roleDiff !== 0) return roleDiff;

      const popularityDiff = (Number(b.popularity) || 0) - (Number(a.popularity) || 0);
      if (popularityDiff !== 0) return popularityDiff;

      return a.displayName.localeCompare(b.displayName);
    });
}

function getInstructorGroups(offering) {
  return Array.isArray(offering?.instructorGroups) && offering.instructorGroups.length
    ? offering.instructorGroups
    : buildInstructorGroups(offering?.meetings);
}

function formatRatingValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "N/A";
  return num.toFixed(1);
}

function formatPercentValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "N/A";
  return `${num.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatCountValue(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "N/A";
  return Math.round(num).toLocaleString();
}

function buildOutsideGroups(allTerms, visibleTerms, selectedTerm, selectedTermLabel) {
  const visibleIds = new Set(visibleTerms.map(offeringIdentity));
  const groups = new Map();

  allTerms.forEach((offering) => {
    if (visibleIds.has(offeringIdentity(offering))) return;

    const key = groupOfferingKey(offering);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        term: offering.term,
        section: offering.section,
        offerings: [],
      });
    }
    groups.get(key).offerings.push(offering);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      label: `Section ${group.section} · ${termLabel(group.term, selectedTerm, selectedTermLabel)}`,
      typeSummary: summarizeTypes(group.offerings),
      catSummary: summarizeCats(group.offerings),
    }))
    .sort((a, b) => {
      const termDiff = String(a.term || "").localeCompare(String(b.term || ""));
      if (termDiff !== 0) return termDiff;
      return String(a.section || "").localeCompare(String(b.section || ""), undefined, { numeric: true });
    });
}

export function CourseDetailPanel({
  course,
  selectedTerm,
  selectedTermLabel,
  onClose,
  savedCatIds,
  onSaveCatNumber,
  onRemoveCatNumber,
  highlightedCatId,
}) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showOutsideSections, setShowOutsideSections] = useState(false);
  const seatsData = useSeats();
  const seats = seatsData?.seats ?? null;
  const generatedAt = seatsData?.generatedAt ?? null;

  // Close panel on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        onClose && onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Filter term offerings based on selected term
  const termOfferings = useMemo(
    () => course?.terms?.filter((t) => t.term === selectedTerm) || [],
    [course?.terms, selectedTerm]
  );
  const offeringGroups = useMemo(() => {
    const map = new Map();

    termOfferings.forEach((offering) => {
      const key = groupOfferingKey(offering);
      if (!map.has(key)) {
        map.set(key, {
          key,
          term: offering.term,
          section: offering.section,
          offerings: [],
        });
      }
      map.get(key).offerings.push(offering);
    });

    return Array.from(map.values()).map((group) => ({
      ...group,
      offerings: [...group.offerings].sort((a, b) =>
        String(a.catNumber || "").localeCompare(String(b.catNumber || ""), undefined, { numeric: true })
      ),
    }));
  }, [termOfferings]);
  const [selectedCatByGroup, setSelectedCatByGroup] = useState({});

  useEffect(() => {
    setSelectedCatByGroup((current) => {
      const next = {};

      offeringGroups.forEach((group) => {
        const highlighted = group.offerings.find(
          (offering) => getCatEntryId(course?.code, offering) === highlightedCatId
        );
        const currentOffering = group.offerings.find(
          (offering, index) => catSelectValue(offering, index) === current[group.key]
        );
        const selected = highlighted || currentOffering || group.offerings[0];
        next[group.key] = catSelectValue(selected, group.offerings.indexOf(selected));
      });

      return next;
    });
  }, [course?.code, highlightedCatId, offeringGroups]);

  const visibleOfferings = offeringGroups.map((group) => {
    const selectedValue = selectedCatByGroup[group.key];
    const offering = group.offerings.find(
      (item, index) => catSelectValue(item, index) === selectedValue
    ) || group.offerings[0];

    return { group, offering };
  });
  const outsideGroups = useMemo(
    () => buildOutsideGroups(course?.allTerms || course?.terms || [], termOfferings, selectedTerm, selectedTermLabel),
    [course?.allTerms, course?.terms, selectedTerm, selectedTermLabel, termOfferings]
  );
  const outsideOfferingCount = outsideGroups.reduce((total, group) => total + group.offerings.length, 0);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSaveToggle = (offering) => {
    const id = getCatEntryId(course.code, offering);
    if (savedCatIds?.has(id)) {
      onRemoveCatNumber?.(id);
      return;
    }

    onSaveCatNumber?.(course, offering);
  };

  const handleCatSelection = (groupKey, value) => {
    setSelectedCatByGroup((current) => ({
      ...current,
      [groupKey]: value,
    }));
  };

  if (!course) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] 
                   bg-white/10 backdrop-blur-2xl border-l border-white/20 
                   shadow-2xl p-6 z-50 flex flex-col overflow-y-auto"
      >
      {/* HEADER */}
      <div
        className="
          flex justify-between items-center mb-4 top-0
          bg-black/30 backdrop-blur-xl p-3 rounded-xl
          border border-white/20 shadow-lg
        "
      >
        <h2 className="text-xl font-bold text-white tracking-wide">
          {course.code}
        </h2>

        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 rounded-lg p-1.5 
                     border border-white/20 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* TITLE + DESC */}
      <h3 className="text-xl text-yellow-200 font-semibold mb-1">
        {course.title}
      </h3>

      <p className="text-gray-200/90 text-sm leading-relaxed mb-4">
        {course.description}
      </p>

      {/* COURSE INFO BOX */}
      <div className="bg-white/10 p-4 rounded-xl border border-white/20 shadow-inner space-y-2">
        <p className="text-gray-300 text-sm">
          <strong className="text-white">Faculty:</strong> {course.faculty}
        </p>
        <p className="text-gray-300 text-sm">
          <strong className="text-white">Credits:</strong> {course.credits}
        </p>
      </div>

      {/* NOTES */}
      <div className="mt-4 space-y-4 text-sm text-yellow-100">
        <p className="italic">
          Always double-check if you need permission from an instructor to enroll.
        </p>

        <p className="italic">
          Open seats shown may not all be available — departments sometimes reserve seats for specific students.
          If you receive a &quot;reserved seats&quot; error when enrolling, please contact the respective department directly.
        </p>

        <p className="italic">
          To manually add this course visit{" "}
          <a
            href="https://wrem.sis.yorku.ca/Apps/WebObjects/REM.woa/wa/DirectAction/rem"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-300 underline"
          >
            REM
          </a>
        </p>

        <p className="italic">
          To map this course into VSB visit{" "}
          <a
            href="https://registrar.yorku.ca/enrol/guide/vsb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-300 underline"
          >
            Visual Schedule Builder
          </a>
        </p>
        <p className="italic">
          <a href="/contact-us" className="underline hover:text-[#7f5af0] transition-colors">Click Here to contact us for any course errors.</a>
        </p>
      </div>

      {/* TERM OFFERINGS */}
      {termOfferings.length > 0 && (
        <div className="mt-6 space-y-6">
          <h4 className="text-yellow-200 font-semibold text-lg">
            Sections for {selectedTermLabel || selectedTerm}
          </h4>

          {visibleOfferings.map(({ group, offering: t }, idx) => (
            <div
              key={group.key}
              className={`bg-white/10 rounded-xl p-4 border backdrop-blur-xl shadow-lg ${
                highlightedCatId === getCatEntryId(course.code, t)
                  ? "border-yellow-200/70 shadow-yellow-300/10"
                  : "border-white/20"
              }`}
            >
              {/* Term + Cat Number */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-yellow-200 font-semibold text-sm">
                    Term: {t.term} — Section {t.section}
                  </p>

                  {group.offerings.length > 1 ? (
                    <div className="mt-2 w-full max-w-[220px]">
                      <Select
                        value={selectedCatByGroup[group.key] || catSelectValue(t, 0)}
                        onValueChange={(value) => handleCatSelection(group.key, value)}
                      >
                        <SelectTrigger className="h-9 w-full bg-black/25 border-white/20 text-white">
                          <SelectValue placeholder="Select CAT" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 backdrop-blur-xl text-white border-white/10">
                          {group.offerings.map((option, optionIndex) => {
                            const summary = shortTimeSummary(option);
                            return (
                              <SelectItem
                                key={catSelectValue(option, optionIndex)}
                                value={catSelectValue(option, optionIndex)}
                              >
                                {option.catNumber || `Option ${optionIndex + 1}`}
                                {summary ? ` - ${summary}` : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : t.catNumber ? (
                    <p className="text-gray-200 text-sm mt-1">
                      <strong className="text-white">Cat Number:</strong>{" "}
                      <span className="font-mono">{t.catNumber}</span>
                    </p>
                  ) : null}

                  {group.offerings.length > 1 && t.catNumber && (
                    <p className="text-gray-200 text-sm mt-2">
                      <strong className="text-white">Selected CAT:</strong>{" "}
                      <span className="font-mono">{t.catNumber}</span>
                    </p>
                  )}

                  {/* Open seats badge */}
                  {t.catNumber && seatsData !== null && (() => {
                    const open = getOpenSeats(seats, t.catNumber);
                    const ts = formatSeatTimestamp(generatedAt);
                    if (open === null) {
                      return (
                        <p className="mt-2 text-[11px] text-gray-600 italic">No seat data</p>
                      );
                    }
                    const isFull = open === 0;
                    const isLow  = open <= 10;
                    const dotColor   = isFull ? "bg-red-400"    : isLow ? "bg-yellow-400"  : "bg-green-400";
                    const textColor  = isFull ? "text-red-300"  : isLow ? "text-yellow-200": "text-green-300";
                    const label      = isFull ? "Full"          : `${open} open seats`;
                    return (
                      <div className="mt-2 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                          <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                        </div>
                        {ts && (
                          <p className="text-[10px] text-gray-400 pl-3.5">Updated {ts}</p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {t.catNumber && (
                  <div className="relative flex flex-col gap-2 sm:items-end">
                    <Button
                      size="sm"
                      className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600
                                 border border-purple-400 text-white shadow-lg shadow-purple-500/50
                                 hover:shadow-purple-500/80 transition-all duration-200 hover:scale-105
                                 flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-semibold"
                      onClick={() => handleCopy(t.catNumber, idx)}
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy CAT
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      className={`border text-white shadow-lg transition-all duration-200 hover:scale-105 flex items-center gap-1.5 px-3 py-1.5 h-auto text-xs font-semibold ${
                        savedCatIds?.has(getCatEntryId(course.code, t))
                          ? "bg-green-500/20 border-green-300/50 hover:bg-green-500/30"
                          : "bg-white/10 border-white/20 hover:bg-white/20"
                      }`}
                      onClick={() => handleSaveToggle(t)}
                    >
                      {savedCatIds?.has(getCatEntryId(course.code, t)) ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          Save
                        </>
                      )}
                    </Button>
                  
                  {/* Confirmation Message */}
                  {copiedIndex === idx && (
                    <MotionDiv
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 right-0 bg-green-500 text-white text-xs 
                                 px-3 py-1.5 rounded-lg whitespace-nowrap font-semibold 
                                 shadow-lg"
                    >
                      Cat Code in clipboard!
                    </MotionDiv>
                  )}
                  </div>
                )}
              </div>

              {/* COURSE TYPES */}
              {t.meetings?.length > 0 && (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-gray-300 text-xs mb-2">
                    <strong className="text-white">Course Types:</strong>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set(t.meetings.map((m) => m.type))).map((type) => {
                      return (
                        <span
                          key={type}
                          className="px-2 py-1 text-[10px] font-semibold bg-white/10 text-white rounded border border-white/20"
                        >
                          {TYPE_LABELS[type] || type}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TIMINGS SECTION */}
              {t.courseTimes && t.courseTimes.length > 0 ? (() => {
                const groupedTimes = splitTimesByRole(t.courseTimes);
                const sections = [
                  { key: "primary", label: "Class Times", times: groupedTimes.primary },
                  { key: "tutorials", label: "Selected Tutorial", times: groupedTimes.tutorials },
                  { key: "labs", label: "Selected Lab", times: groupedTimes.labs },
                  { key: "other", label: "Other Selected Times", times: groupedTimes.other },
                ].filter((section) => section.times.length > 0);

                return (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <div className="space-y-3">
                    {sections.map((section) => (
                      <div key={section.key}>
                        <p className="text-gray-300 text-xs mb-2">
                          <strong className="text-white">{section.label}:</strong>
                        </p>
                        <div className="space-y-1.5 text-xs">
                          {section.times.map((timing, i) => (
                            <div key={`${section.key}-${i}`} className="flex items-center gap-2 text-gray-200">
                              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-semibold min-w-fit text-[10px]">
                                {TYPE_LABELS[timing.type] || timing.type}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-semibold min-w-fit text-[10px]">
                                {DAY_LABELS[timing.dayOfWeek] || timing.dayOfWeek}
                              </span>
                              <span className="text-gray-300">
                                {timing.startTime}
                                {timing.endTime ? ` - ${timing.endTime}` : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })() : t.meetings?.some((m) => m.dayOfWeek && m.startTime) ? (
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-gray-300 text-xs mb-2">
                    <strong className="text-white">📅 Class Times:</strong>
                  </p>
                  <div className="space-y-1 text-sm text-gray-200">
                    {t.meetings.map((m, i) =>
                      m.dayOfWeek && m.startTime ? (
                        <div key={i} className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-xs">
                            {DAY_LABELS[m.dayOfWeek] || m.dayOfWeek}
                          </span>
                          <span className="text-xs">
                            {m.startTime}
                            {m.endTime ? ` – ${m.endTime}` : ""}
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ) : null}

              

              {/* INSTRUCTORS */}
              {(() => {
                const instructorGroups = getInstructorGroups(t);

                return instructorGroups.length > 0 ? (
                  <div className="space-y-4">
                    {instructorGroups.map((instructor, index) => {
                      const roles = Array.isArray(instructor.roles) ? instructor.roles : [];
                      const displayName = instructor.displayName ||
                        `${instructor.firstName || ""} ${instructor.lastName || ""}`.trim() ||
                        "TBA";

                      return (
                        <div
                          key={`${displayName}-${roles.map(roleLabel).join("-")}-${index}`}
                          className="bg-black/20 rounded-lg p-3 border border-white/10"
                        >
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {roles.length ? roles.map((role, roleIndex) => (
                              <span
                                key={`${roleLabel(role)}-${roleIndex}`}
                                className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-semibold text-gray-100"
                              >
                                {roleLabel(role)}
                              </span>
                            )) : (
                              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] font-semibold text-gray-100">
                                Instructor
                              </span>
                            )}
                          </div>

                          <p className="text-white text-sm font-semibold">
                            {displayName}
                          </p>

                          {/* RMP Ratings */}
                          <div className="text-gray-300 text-xs mt-1 space-y-1">
                            <p>
                              ⭐ <strong>{formatRatingValue(instructor.avgRating)}</strong> / 5
                            </p>
                            <p>
                              📘 Difficulty:{" "}
                              <strong>{formatRatingValue(instructor.avgDifficulty)}</strong>
                            </p>
                            <p>
                              🔁 Would take again:{" "}
                              <strong>{formatPercentValue(instructor.wouldTakeAgainPercent)}</strong>
                            </p>
                            <p>
                              🧪 Ratings:{" "}
                              <strong>{formatCountValue(instructor.numberOfRatings)}</strong>
                            </p>
                          </div>

                          {/* RMP Link */}
                          {instructor.rateMyProfLink && (
                            <a
                              href={instructor.rateMyProfLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-yellow-300 underline text-xs mt-2 inline-block"
                            >
                              View on RateMyProfessors →
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm italic">
                    No instructor information available.
                  </p>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      {termOfferings.length === 0 && (
        <div className="mt-6 text-center text-gray-300">
          <p>No sections offered for this term.</p>
        </div>
      )}

      {outsideGroups.length > 0 && (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <button
            type="button"
            onClick={() => setShowOutsideSections((current) => !current)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <h4 className="text-sm font-semibold text-gray-100">
                Available, But Outside Your Filters
              </h4>
              <p className="mt-1 text-xs text-gray-400">
                {outsideOfferingCount} section option{outsideOfferingCount === 1 ? "" : "s"} in {outsideGroups.length} group{outsideGroups.length === 1 ? "" : "s"}
              </p>
            </div>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${
                showOutsideSections ? "rotate-180" : ""
              }`}
            />
          </button>

          {showOutsideSections && (
            <div className="mt-4 space-y-2">
              {outsideGroups.map((group) => (
                <div
                  key={group.key}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <p className="text-sm font-semibold text-gray-100">{group.label}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {group.typeSummary} · {group.catSummary}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </>
  );
}
