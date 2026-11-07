/**
 * Errors the browser SDK drops before sending, because no visitor can cause or
 * see them.
 *
 * "Object Not Found Matching Id:N, MethodName:update, ParamCount:4" is thrown
 * by Microsoft's link scanner (Outlook Safe Links / Defender) while it renders
 * a link from an email: its automation host rejects a promise with that plain
 * string, so it reaches Sentry as a "Non-Error promise rejection" on whatever
 * page the email linked to (UPUP-LANDING-6). Our code has no such call.
 * Matched on the message as Sentry builds it, so any other rejection still
 * reports.
 */
export const SENTRY_IGNORED_ERRORS: RegExp[] = [
    /Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/,
]
