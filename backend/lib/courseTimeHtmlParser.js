export const DAY_ORDER = { M: 1, T: 2, W: 3, R: 4, Th: 4, F: 5, S: 6, Sat: 6, U: 7, Sun: 7 };

export function cleanHtmlText(value) {
  return (value ?? '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeHtmlType(value) {
  return cleanHtmlText(value).replace(/\s+/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
}

export function normalizeComponentNumber(value) {
  const text = cleanHtmlText(value);
  return text || null;
}

export function parseTypeAndComponent(value) {
  const text = cleanHtmlText(value).toUpperCase();
  const match = text.match(/^([A-Z]+)\s*([A-Z0-9]*)/);
  if (!match) {
    return {
      type: normalizeHtmlType(text),
      componentNumber: null,
      rawType: text,
    };
  }

  return {
    type: normalizeHtmlType(match[1]),
    componentNumber: normalizeComponentNumber(match[2]),
    rawType: text,
  };
}

export function calculateEndTime(startTime, durationMinutes) {
  const [hours, mins] = String(startTime).split(':').map(Number);
  const duration = Math.floor(Number(durationMinutes));
  if (!Number.isFinite(hours) || !Number.isFinite(mins) || !Number.isFinite(duration)) return null;

  const totalMinutes = hours * 60 + mins + duration;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

export function decodeHtml(buffer) {
  if (buffer.length >= 2) {
    const b0 = buffer[0];
    const b1 = buffer[1];

    if (b0 === 0xfe && b1 === 0xff) {
      const body = buffer.slice(2);
      const swapped = Buffer.allocUnsafe(body.length);
      for (let i = 0; i + 1 < body.length; i += 2) {
        swapped[i] = body[i + 1];
        swapped[i + 1] = body[i];
      }
      return swapped.toString('utf16le');
    }

    if (b0 === 0xff && b1 === 0xfe) {
      return buffer.slice(2).toString('utf16le');
    }
  }

  return buffer.toString('utf8');
}

function parseMeetingTimes($, timesTd) {
  const times = [];

  for (const tr of timesTd.find('table tr').toArray()) {
    const cells = $(tr).find('td').toArray();
    if (cells.length < 3) continue;

    const dayOfWeek = cleanHtmlText($(cells[0]).text());
    const startTime = cleanHtmlText($(cells[1]).text());
    const durationMinutes = Math.floor(parseInt(cleanHtmlText($(cells[2]).text()), 10));
    if (!dayOfWeek || !startTime || Number.isNaN(durationMinutes)) continue;

    times.push({
      dayOfWeek,
      startTime,
      durationMinutes,
      endTime: calculateEndTime(startTime, durationMinutes),
    });
  }

  return times;
}

export function parseCourseTimeHtml($) {
  const rows = $("table[border='1']").first().find('tr').toArray();
  const parsed = [];

  let currentFaculty = null;
  let currentDept = null;
  let currentTerm = null;
  let lastCourseCode = null;
  let lastCredit = null;
  let lastSection = null;

  for (const row of rows) {
    const tds = $(row).find('> td').toArray();
    if (tds.length === 0) continue;
    if (cleanHtmlText($(tds[0]).text()) === 'Fac') continue;

    const td3colspan = tds[3] ? $(tds[3]).attr('colspan') : undefined;
    if (tds.length >= 4 && td3colspan === '8') {
      currentFaculty = cleanHtmlText($(tds[0]).text());
      currentDept = cleanHtmlText($(tds[1]).text());
      currentTerm = cleanHtmlText($(tds[2]).text());
      continue;
    }

    if (!currentFaculty || !currentDept || !currentTerm) continue;

    const firstColspan = $(tds[0]).attr('colspan');
    let type = null;
    let componentNumber = null;
    let catNumber = null;
    let timesTd = null;

    if (firstColspan === '3') {
      const courseCellText = cleanHtmlText($(tds[1]).text());
      type = normalizeHtmlType($(tds[3]).text());
      componentNumber = normalizeComponentNumber($(tds[4]).text());
      catNumber = cleanHtmlText($(tds[5]).text()) || null;
      timesTd = tds[6] ? $(tds[6]) : null;

      const match = courseCellText.match(/(?<code>\d{4}[A-Z]?)\s+(?<credit>\d+\.\d{2})\s+(?<section>[A-Z0-9]+)/);
      if (!match) continue;

      lastCourseCode = match.groups.code;
      lastCredit = Number(match.groups.credit);
      lastSection = match.groups.section;
    } else if (firstColspan === '5') {
      type = normalizeHtmlType($(tds[1]).text());
      componentNumber = normalizeComponentNumber($(tds[2]).text());
      catNumber = cleanHtmlText($(tds[3]).text()) || null;
      timesTd = tds[4] ? $(tds[4]) : null;
      if (!lastCourseCode || !lastSection || lastCredit == null) continue;
    } else {
      continue;
    }

    if (!type || !timesTd) continue;

    const times = parseMeetingTimes($, timesTd);
    parsed.push({
      faculty: currentFaculty,
      dept: currentDept,
      code: lastCourseCode,
      credit: lastCredit,
      term: currentTerm,
      section: lastSection,
      type,
      componentNumber,
      catNumber,
      times,
    });
  }

  return parsed;
}

export function flattenCourseTimeComponents(components) {
  return components.flatMap((component) =>
    component.times.map((time) => ({
      ...component,
      ...time,
      times: undefined,
    }))
  );
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.MAX_SAFE_INTEGER;
  return hours * 60 + minutes;
}

export function sortCourseTimes(times) {
  times.sort((a, b) => {
    const dayDiff = (DAY_ORDER[a.dayOfWeek] ?? 99) - (DAY_ORDER[b.dayOfWeek] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    const timeDiff = minutesFromTime(a.startTime) - minutesFromTime(b.startTime);
    if (timeDiff !== 0) return timeDiff;
    const typeDiff = String(a.type).localeCompare(String(b.type));
    if (typeDiff !== 0) return typeDiff;
    return String(a.componentNumber || '').localeCompare(String(b.componentNumber || ''));
  });
  return times;
}
