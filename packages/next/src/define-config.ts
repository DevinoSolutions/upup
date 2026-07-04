import type { UpupServerConfig } from "@upup/server";

function isNonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Validate a server config at startup and return it unchanged. Throws ONE error
 * listing every missing required field, so a forgotten env var fails fast and
 * loud instead of surfacing as a confusing 500 at request time.
 */
export function defineUpupConfig(config: UpupServerConfig): UpupServerConfig {
  const missing: string[] = [];

  if (!config.storage) {
    missing.push("storage");
  } else {
    if (!isNonEmpty(config.storage.bucket)) missing.push("storage.bucket");
    if (!isNonEmpty(config.storage.region)) missing.push("storage.region");
    // Both-or-neither: undefined creds are OK (IAM role), but a half-set pair
    // (the classic `process.env.X!` -> "" bug) must fail loudly.
    const hasId = config.storage.accessKeyId !== undefined;
    const hasSecret = config.storage.secretAccessKey !== undefined;
    if (hasId || hasSecret) {
      if (!isNonEmpty(config.storage.accessKeyId))
        missing.push("storage.accessKeyId");
      if (!isNonEmpty(config.storage.secretAccessKey))
        missing.push("storage.secretAccessKey");
    }
  }

  const p = config.providers;
  if (p?.googleDrive) {
    if (!isNonEmpty(p.googleDrive.clientId))
      missing.push("providers.googleDrive.clientId");
    if (!isNonEmpty(p.googleDrive.clientSecret))
      missing.push("providers.googleDrive.clientSecret");
  }
  if (p?.dropbox) {
    if (!isNonEmpty(p.dropbox.appKey)) missing.push("providers.dropbox.appKey");
    if (!isNonEmpty(p.dropbox.appSecret))
      missing.push("providers.dropbox.appSecret");
  }
  if (p?.oneDrive) {
    if (!isNonEmpty(p.oneDrive.clientId))
      missing.push("providers.oneDrive.clientId");
    if (!isNonEmpty(p.oneDrive.clientSecret))
      missing.push("providers.oneDrive.clientSecret");
  }
  if (p?.box) {
    if (!isNonEmpty(p.box.clientId)) missing.push("providers.box.clientId");
    if (!isNonEmpty(p.box.clientSecret))
      missing.push("providers.box.clientSecret");
  }

  if (missing.length > 0) {
    throw new Error(
      "[@upup/next] Invalid upup config — missing/empty required field(s):\n" +
        missing.map((m) => `  - ${m}`).join("\n"),
    );
  }
  return config;
}
