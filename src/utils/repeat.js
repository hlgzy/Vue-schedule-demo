// Repeat schedule expansion logic for V1.5.
// Expands a repeating schedule into occurrence descriptors within a date range.
// Each occurrence is a plain object that looks like a schedule but has:
//   id / occKey = `${baseId}_${YYYY-MM-DD}` (unique per occurrence date)
//   baseId = the original schedule id
//   isOccurrence = true
//   startTime / endTime shifted to the occurrence date (preserving time-of-day)
//
// Exceptions (for "edit this occurrence only" / "delete this occurrence"):
//   [{ key, type, data? }]  where key = `${baseId}_${YYYY-MM-DD}`
//   type = 'exclude'  → skip this occurrence (tombstone)
//   type = 'override' → replace occurrence with `data` (a full schedule object)

import { parseISO, toLocalISO, toDateStr, addDays, startOfDay } from "./date"

const MAX_OCCURRENCES = 5000

// Build the occurrence key for a base schedule on a given Date.
function occKeyFor(baseId, date) {
  return baseId + "_" + toDateStr(date)
}

// Check if an occurrence [occStart, occEnd) overlaps [rangeStart, rangeEnd).
function overlapsRange(occStart, occEnd, rangeStart, rangeEnd) {
  return occStart < rangeEnd && occEnd > rangeStart
}

// Preserve day-offset for all-day schedules.
function allDayDurationDays(base) {
  const bs = parseISO(base.startTime)
  const be = parseISO(base.endTime) || bs
  return Math.max(0, Math.round((startOfDay(be) - startOfDay(bs)) / 86400000))
}

// Build an occurrence object from base schedule + occurrence date.
function buildOccurrence(base, occDate) {
  const baseStart = parseISO(base.startTime)
  const baseEnd = parseISO(base.endTime) || baseStart
  const key = occKeyFor(base.id, occDate)
  let startTime, endTime

  if (base.isAllDay) {
    const dayDiff = allDayDurationDays(base)
    startTime = toLocalISO(new Date(occDate.getFullYear(), occDate.getMonth(), occDate.getDate(), 0, 0, 0))
    const endDate = addDays(occDate, dayDiff)
    endTime = toLocalISO(new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 0, 0, 0))
  } else {
    const occStart = new Date(occDate)
    occStart.setHours(baseStart.getHours(), baseStart.getMinutes(), baseStart.getSeconds(), 0)
    const occEnd = new Date(occDate)
    occEnd.setHours(baseEnd.getHours(), baseEnd.getMinutes(), baseEnd.getSeconds(), 0)
    startTime = toLocalISO(occStart)
    endTime = toLocalISO(occEnd)
  }

  return Object.assign({}, base, {
    startTime: startTime,
    endTime: endTime,
    id: key,
    baseId: base.id,
    occKey: key,
    isOccurrence: true
  })
}

// Does this occurrence date match the repeat rule?
function matchesRule(cursor, type, rule, baseStart) {
  const day = cursor.getDay() // 0=Sunday .. 6=Saturday
  if (type === "day") {
    return true
  }
  if (type === "week") {
    const days = Array.isArray(rule) && rule.length > 0 ? rule : [baseStart.getDay()]
    return days.indexOf(day) > -1
  }
  if (type === "month") {
    return cursor.getDate() === baseStart.getDate()
  }
  if (type === "year") {
    return cursor.getMonth() === baseStart.getMonth() && cursor.getDate() === baseStart.getDate()
  }
  return false
}

// Advance the cursor by one repeat interval.
function nextOccurrence(cursor, type) {
  if (type === "day" || type === "week") {
    return addDays(cursor, 1)
  }
  if (type === "month") {
    const m = new Date(cursor)
    m.setMonth(m.getMonth() + 1)
    return m
  }
  if (type === "year") {
    const y = new Date(cursor)
    y.setFullYear(y.getFullYear() + 1)
    return y
  }
  return addDays(cursor, 1)
}

// Coarse-jump the cursor near rangeStart (only for non-count end types).
function coarseJump(cursor, type, rangeStart, baseStart) {
  const jumped = new Date(rangeStart)
  if (type === "day") {
    return addDays(jumped, -1)
  }
  if (type === "week") {
    // Jump to a few days before rangeStart; the day filter will pick valid days.
    return addDays(jumped, -7)
  }
  if (type === "month") {
    // Jump to the first of the month before rangeStart's month.
    const m = new Date(jumped.getFullYear(), jumped.getMonth() - 1, 1)
    return m
  }
  if (type === "year") {
    // Jump to January 1st of the previous year.
    return new Date(jumped.getFullYear() - 1, 0, 1)
  }
  return cursor
}

// Check if the repeat has ended (for date/count end types).
function isRepeatEnded(cursor, base, occCount) {
  if (base.repeatEndType === "date") {
    const endDate = parseISO(base.repeatEndDate)
    if (endDate && startOfDay(cursor) > startOfDay(endDate)) {
      return true
    }
  }
  if (base.repeatEndType === "count") {
    if (base.repeatCount > 0 && occCount >= base.repeatCount) {
      return true
    }
  }
  return false
}

// Expand a single schedule into occurrences within [rangeStart, rangeEnd).
export function expandSchedule(schedule, rangeStart, rangeEnd, exceptions) {
  const excMap = {}
  if (Array.isArray(exceptions)) {
    for (const e of exceptions) {
      excMap[e.key] = e
    }
  }

  // Non-repeating schedule: return a single occurrence if it overlaps the range.
  if (!schedule.repeatType || schedule.repeatType === "none") {
    const occStart = parseISO(schedule.startTime)
    const occEnd = parseISO(schedule.endTime) || occStart
    if (!occStart) return []
    if (overlapsRange(occStart, occEnd, rangeStart, rangeEnd)) {
      return [schedule]
    }
    return []
  }

  // Repeating schedule.
  const baseStart = parseISO(schedule.startTime)
  if (!baseStart) return []

  const type = schedule.repeatType
  const rule = schedule.repeatRule
  const results = []
  let occCount = 0
  let cursor

  // For count-based end, we must iterate from the beginning to count correctly.
  if (schedule.repeatEndType === "count") {
    cursor = new Date(baseStart)
  } else {
    // Coarse-jump near rangeStart to avoid iterating from years ago.
    cursor = coarseJump(baseStart, type, rangeStart, baseStart)
    // For month/year, the coarse jump might land on a non-matching day.
    // We iterate forward from there and matchRule will pick valid days.
  }

  let safety = MAX_OCCURRENCES
  while (safety-- > 0) {
    // Check end conditions before processing.
    if (isRepeatEnded(cursor, schedule, occCount)) {
      break
    }

    // Check if cursor is past the range (we're done).
    if (cursor >= rangeEnd) {
      break
    }

    // Check if this cursor date matches the repeat rule.
    if (matchesRule(cursor, type, rule, baseStart)) {
      occCount++
      // Re-check count end after incrementing.
      if (schedule.repeatEndType === "count" && schedule.repeatCount > 0 && occCount > schedule.repeatCount) {
        break
      }

      // Build the occurrence.
      const occDate = startOfDay(cursor)
      const key = occKeyFor(schedule.id, occDate)
      const exc = excMap[key]

      if (exc && exc.type === "exclude") {
        // Skip this occurrence (tombstone).
      } else if (exc && exc.type === "override" && exc.data) {
        // Replace with override data, but keep the occurrence id structure.
        const override = Object.assign({}, exc.data, {
          id: key,
          baseId: schedule.id,
          occKey: key,
          isOccurrence: true
        })
        const oStart = parseISO(override.startTime)
        const oEnd = parseISO(override.endTime) || oStart
        if (overlapsRange(oStart, oEnd, rangeStart, rangeEnd)) {
          results.push(override)
        }
      } else {
        // Normal occurrence.
        const occ = buildOccurrence(schedule, occDate)
        const oStart = parseISO(occ.startTime)
        const oEnd = parseISO(occ.endTime) || oStart
        if (overlapsRange(oStart, oEnd, rangeStart, rangeEnd)) {
          results.push(occ)
        }
      }
    }

    cursor = nextOccurrence(cursor, type)
  }

  return results
}

// Expand an array of schedules into all occurrences within a range.
export function expandAll(schedules, rangeStart, rangeEnd, exceptions) {
  const all = []
  for (const s of schedules) {
    const occs = expandSchedule(s, rangeStart, rangeEnd, exceptions)
    for (const o of occs) {
      all.push(o)
    }
  }
  return all
}
