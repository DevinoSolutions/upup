"use client";

import React, { useContext } from "react";

import { UpupUploader, type Translations } from "@upup/react";
import "@upup/react/styles";
import { ThemeContext } from "@/lib/contexts";
import { toast } from "react-toastify";

// v2 source mapping — human-readable strings
const adapterToSource: Record<string, string> = {
  INTERNAL: "local",
  GOOGLE_DRIVE: "google_drive",
  ONE_DRIVE: "onedrive",
  LINK: "url",
  CAMERA: "camera",
  DROPBOX: "dropbox",
  AUDIO: "microphone",
  SCREEN_CAPTURE: "screen",
};

interface Props {
  limit: number;
  mini: boolean;
  theme?: string;
  enabledAdapters?: string[];
  allowPreview?: boolean;
  shouldCompress?: boolean;
  fileSizeLimit?: number;
  maxRetries?: number;
  localePack?: Translations;
  imageEditor?: boolean;
}

export default function Uploader({
  limit,
  mini,
  theme = "blue",
  enabledAdapters = ["INTERNAL", "GOOGLE_DRIVE", "ONE_DRIVE", "LINK", "CAMERA"],
  allowPreview = true,
  shouldCompress = false,
  fileSizeLimit = 25,
  maxRetries,
  localePack,
  imageEditor = false,
}: Readonly<Props>) {
  const { isDarkMode } = useContext(ThemeContext);

  // v2: convert adapter strings to source shorthand
  const sources = enabledAdapters
    .map((a) => adapterToSource[a])
    .filter(Boolean) as any[];

  const currentTheme = theme || "blue";

  const customClassNames = {
    containerMini: `uploader-container-mini-${currentTheme} `,
    containerFull: `uploader-container-full-${currentTheme}`,
    fileListContainer: `uploader-file-list-${currentTheme}`,
    driveBody: `uploader-drive-body-${currentTheme}`,
    adapterView: `uploader-adapter-view-${currentTheme}`,
    uploadButton: `uploader-btn-${currentTheme}`,
    uploadDoneButton: `uploader-btn-${currentTheme}`,
    adapterButton: `uploader-adapter-${currentTheme}`,
    progressBar: `uploader-progress-${currentTheme}`,
    progressBarInner: `uploader-progress-${currentTheme}`,
    filePreviewButton: `uploader-preview-${currentTheme}`,
    containerAddMoreButton: `uploader-add-${currentTheme}`,
    driveAddFilesButton: `uploader-btn-${currentTheme}`,
    urlFetchButton: `uploader-btn-${currentTheme}`,
    cameraAddButton: `uploader-btn-${currentTheme}`,
    adapterButtonIcon: `uploader-file-list-${currentTheme}`,
    adapterButtonText: `uploader-preview-${currentTheme}`,
  };

  return (
    <div className="flex justify-center items-center w-full h-full lg:min-h-[auto] min-h-[70vh]">
      <UpupUploader
        provider="backblaze"
        maxFiles={limit}
        uploadEndpoint={
          process.env.NEXT_PUBLIC_BASE_URL
            ? process.env.NEXT_PUBLIC_BASE_URL + "/api/upup"
            : "/api/upup"
        }
        sources={sources}
        cloudDrives={{
          googleDrive: {
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
            appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID || "",
          },
          oneDrive: {
            clientId: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || "",
          },
          dropbox: {
            clientId: process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID || "",
          },
        }}
        theme={{ mode: isDarkMode ? "dark" : "light" }}
        mini={mini}
        allowPreview={allowPreview}
        imageCompression={shouldCompress}
        imageEditor={imageEditor}
        maxFileSize={{ size: fileSizeLimit, unit: "MB" }}
        classNames={customClassNames}
        maxRetries={maxRetries}
        i18n={localePack ? { locale: localePack } : undefined}
        onFilesUploadComplete={(files) => {
          console.log("Files uploaded successfully:", files);
          toast.success("Files uploaded successfully!");
        }}
        onError={(e) => {
          console.error(e);
          toast.error(e);
        }}
        onWarn={(warning) => {
          console.warn(warning);
          toast.warn(warning);
        }}
        onFileTypeMismatch={(file, acceptedTypes) => {
          toast.error(
            `File type not supported. Accepted types: ${acceptedTypes}`,
          );
        }}
        onFileUploadStart={(file) => {
          toast.info(`Starting upload: ${file.name}`);
        }}
        onFileUploadComplete={(file) => {
          toast.success(`Upload complete: ${file.name}`);
        }}
      />
    </div>
  );
}
