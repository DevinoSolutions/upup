import { FileSource } from "@upup/core";
import type { UploaderContext } from "../lib/types";
import { clientDriveUploader } from "./client-drive-uploader";
import { serverModeDriveUploader } from "./server-mode-drive-uploader";

export function oneDriveUploader(ctx: UploaderContext) {
  return ctx.mode === "server"
    ? serverModeDriveUploader(ctx, {
        provider: "onedrive",
        onBack: () => ctx.setActiveSource(undefined),
      })
    : clientDriveUploader(ctx, FileSource.ONE_DRIVE);
}
