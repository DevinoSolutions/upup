import type { CoreOptions } from '../core'

/**
 * Constructor-time merge of `restrictions` + `cloudDrives` into flat options.
 * Guards on the RESOLVED value (`!options.maxFileSize`) and cloudDrives fills
 * only when the flat config is ABSENT (flat wins). `options` is the original
 * constructor argument; `target` is the (already-spread) options being mutated.
 *
 * Intentionally NOT unified with mergeUpdateOptions — see spec §5 Trap A.
 */
export function mergeConstructOptions(target: CoreOptions, options: CoreOptions): void {
  if (options.restrictions) {
    const r = options.restrictions
    if (r.maxFileSize && !options.maxFileSize) target.maxFileSize = r.maxFileSize
    if (r.minFileSize && !options.minFileSize) target.minFileSize = r.minFileSize
    if (r.maxTotalFileSize && !options.maxTotalFileSize) target.maxTotalFileSize = r.maxTotalFileSize
    if (r.maxNumberOfFiles != null && !options.limit) target.limit = r.maxNumberOfFiles
    if (r.minNumberOfFiles != null && !options.minFiles) target.minFiles = r.minNumberOfFiles
    if (r.allowedFileTypes && !options.allowedFileTypes) target.allowedFileTypes = r.allowedFileTypes.join(',')
  }

  if (options.cloudDrives) {
    const cd = options.cloudDrives
    if (cd.googleDrive && !options.googleDriveConfigs) {
      target.googleDriveConfigs = cd.googleDrive as unknown as Record<string, unknown>
    }
    if (cd.oneDrive && !options.oneDriveConfigs) {
      target.oneDriveConfigs = cd.oneDrive as unknown as Record<string, unknown>
    }
    if (cd.dropbox && !options.dropboxConfigs) {
      target.dropboxConfigs = cd.dropbox as unknown as Record<string, unknown>
    }
  }
}

/**
 * Update-time merge. Guards on KEY PRESENCE in the partial
 * (`!('maxFileSize' in partial)`) and cloudDrives OVERWRITE unconditionally
 * (partial wins). Call AFTER `Object.assign(target, partial)`.
 *
 * Intentionally NOT unified with mergeConstructOptions — see spec §5 Trap A.
 */
export function mergeUpdateOptions(target: CoreOptions, partial: Partial<CoreOptions>): void {
  if (partial.restrictions) {
    const r = partial.restrictions
    if (r.maxFileSize && !('maxFileSize' in partial)) target.maxFileSize = r.maxFileSize
    if (r.minFileSize && !('minFileSize' in partial)) target.minFileSize = r.minFileSize
    if (r.maxTotalFileSize && !('maxTotalFileSize' in partial)) target.maxTotalFileSize = r.maxTotalFileSize
    if (r.maxNumberOfFiles != null && !('limit' in partial)) target.limit = r.maxNumberOfFiles
    if (r.minNumberOfFiles != null && !('minFiles' in partial)) target.minFiles = r.minNumberOfFiles
    if (r.allowedFileTypes && !('allowedFileTypes' in partial)) target.allowedFileTypes = r.allowedFileTypes.join(',')
  }

  if (partial.cloudDrives) {
    const cd = partial.cloudDrives
    if (cd.googleDrive) {
      target.googleDriveConfigs = cd.googleDrive as unknown as Record<string, unknown>
    }
    if (cd.oneDrive) {
      target.oneDriveConfigs = cd.oneDrive as unknown as Record<string, unknown>
    }
    if (cd.dropbox) {
      target.dropboxConfigs = cd.dropbox as unknown as Record<string, unknown>
    }
  }
}
