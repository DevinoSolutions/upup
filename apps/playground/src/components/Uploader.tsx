"use client";

import React, { useContext } from "react";

import { UpupUploader, type Translations } from "upup-react-file-uploader";
import "upup-react-file-uploader/styles";
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

  const customSlots = {
    uploader: {
      container: `uploader-container-full-${currentTheme}`,
    },
    fileList: {
      root: `uploader-file-list-${currentTheme}`,
      uploadButton: `uploader-btn-${currentTheme}`,
      doneButton: `uploader-btn-${currentTheme}`,
      addMoreButton: `uploader-add-${currentTheme}`,
    },
    sourceSelector: {
      adapterButton: `uploader-adapter-${currentTheme}`,
      adapterButtonIcon: `uploader-file-list-${currentTheme}`,
      adapterButtonText: `uploader-preview-${currentTheme}`,
    },
    sourceView: {
      root: `uploader-adapter-view-${currentTheme}`,
    },
    driveBrowser: {
      body: `uploader-drive-body-${currentTheme}`,
      addFilesButton: `uploader-btn-${currentTheme}`,
    },
    filePreview: {
      previewButton: `uploader-preview-${currentTheme}`,
    },
    progressBar: {
      track: `uploader-progress-${currentTheme}`,
      fill: `uploader-progress-${currentTheme}`,
    },
    urlUploader: {
      fetchButton: `uploader-btn-${currentTheme}`,
    },
    cameraUploader: {
      addButton: `uploader-btn-${currentTheme}`,
    },
  };

  return (
    <div className="flex justify-center items-center w-full h-full lg:min-h-[auto] min-h-[70vh]">
      <UpupUploader
        provider="backblaze"
        maxFiles={limit}
        serverUrl={
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
        theme={{ mode: isDarkMode ? "dark" : "light", slots: customSlots }}
        mini={mini}
        allowPreview={allowPreview}
        imageCompression={shouldCompress}
        imageEditor={imageEditor}
        maxFileSize={{ size: fileSizeLimit, unit: "MB" }}
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
