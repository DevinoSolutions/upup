// src/fixtures/heicSample.ts
// AUTO-GENERATED from fixtures/sample.heic by scripts/gen-heic-fixture.mjs.
// Do not hand-edit — regenerate after replacing sample.heic. See fixtures/README.md.
import { base64ToBytes } from './base64'

export const HEIC_SAMPLE_BASE64 =
  'AAAAHGZ0eXBoZWljAAAAAG1pZjFoZWljbWlhZgAAAVRtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAACJpbG9jAAAAAERAAAEAAQAAAAABeAABAAAAAAAAAB4AAAAjaWluZgAAAAAAAQAAABVpbmZlAgAAAAABAABodmMxAAAAAA5waXRtAAAAAAABAAAA1GlwcnAAAAC1aXBjbwAAAHhodmNDAQNwAAAAAAAAAAAAHvAA/P34+AAADwNgAAEAGEABDAH//wNwAAADAJAAAAMAAAMAHroCQGEAAQArQgEBA3AAAAMAkAAAAwAAAwAeoCCBBZbqSSmubgIaDAgAAAMAyAAAAwAIQGIAAQAHRAHBcrAiQAAAABNjb2xybmNseAABAA0ABoAAAAAUaXNwZQAAAAAAAABAAAAAQAAAAA5waXhpAAAAAAEIAAAAF2lwbWEAAAAAAAAAAQABBIECAwQAAAAmbWRhdAAAABooAa8E+EEyacv/S7/5H9i13//vHhpPRxg2/A=='

export function buildHeicFile(name = 'sample.heic'): File {
  return new File([base64ToBytes(HEIC_SAMPLE_BASE64)], name, { type: 'image/heic' })
}
