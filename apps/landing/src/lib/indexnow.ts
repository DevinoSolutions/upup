// IndexNow (https://www.indexnow.org/documentation) lets a site push URL
// changes to participating engines (Bing, Yandex, Seznam, Naver) instead of
// waiting to be recrawled. Ownership is proved by hosting a key file: a plain
// text file at `https://<host>/<key>.txt` whose body is EXACTLY the key, served
// as `text/plain`. An engine fetches it when a submission arrives; a missing,
// redirected, or differently-bodied file makes every submission fail.
//
// This module is the single source of truth for that key. The route directory
// `src/app/<key>.txt/` must stay byte-identical to INDEXNOW_KEY — a rename in
// one place and not the other silently breaks verification, so
// `src/__tests__/indexnow.test.ts` pins the two together.
//
// Submissions are NOT made from this app: `.github/workflows/indexnow.yml` runs
// scripts/ci/indexnow-submit.mjs daily. That script reads the INDEXNOW_KEY line
// below as text (CI's Node 20 cannot import TypeScript), so keep it a single
// quoted string literal on one line; its node:test suite fails otherwise.
export const INDEXNOW_KEY = '5cb30cbda540958e8d033652400e59e3'

export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`
