// The ONE calendar-date rule for the page-lastmod snapshot: every date it
// writes or checks is a UTC calendar date.
//
// Ported from DoDomain (scripts/seo/lastmod-date.mjs), where the generator
// first read `git log --format=%cs`. %cs prints the date in the COMMITTER's
// local offset, while the check's "is it in the future?" test compares against
// today's UTC date: a commit made at 00:03+01:00 (23:03Z the day before) was
// stamped with the local date and refused as a future date for the next hour.
// Both sides read their dates from here, so they cannot disagree.

/**
 * YYYY-MM-DD of `instant` on the UTC calendar. Accepts a Date or any string
 * `Date` parses (e.g. git's strict ISO 8601 `%cI`, offset included). Throws on
 * an unparseable value rather than stamping a page with a made-up date.
 */
export function utcCalendarDate(instant) {
    const date = instant instanceof Date ? instant : new Date(instant)
    if (Number.isNaN(date.getTime())) {
        throw new Error(
            `page-lastmod: cannot read a date from ${JSON.stringify(instant)}`,
        )
    }
    return date.toISOString().slice(0, 10)
}

/** Today's UTC calendar date. `now` is injectable for tests. */
export function todayUtc(now = new Date()) {
    return utcCalendarDate(now)
}
