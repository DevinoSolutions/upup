"use client";

import React, { useContext } from "react";

import { UpupUploader } from "@upup/react";
import { StorageProvider, FileSource, Translations } from "@upup/shared";

import "@upup/react/styles";
import { ThemeContext } from "@/lib/contexts";
import { toast } from "react-toastify";

const customFields = {
  uploadEndpoint: process.env.NEXT_PUBLIC_BASE_URL
    ? process.env.NEXT_PUBLIC_BASE_URL + "/api/upup"
    : "/api/upup", // fallback to relative path
  driveConfigs: {
    googleDrive: {
      google_client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
      google_api_key: process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "",
      google_app_id: process.env.NEXT_PUBLIC_GOOGLE_APP_ID || "",
    },
    oneDrive: {
      onedrive_client_id: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID || "",
    },
    dropbox: {
      dropbox_client_id: process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID || "",
    },
  },
};

interface Props {
  limit: number;
  mini: boolean;
  theme?: string;
  enabledAdapters?: string[];
  shouldCompress?: boolean;
  imageCompression?: boolean;
  fileSizeLimit?: number; // in MB
  maxRetries?: number;
  translations?: Translations;
  thumbnailGenerator?: boolean;
  onBeforeFileAdded?: (file: File) => boolean | File | undefined;
}

export default function Uploader({
  limit,
  mini,
  theme = "blue",
  enabledAdapters = ["INTERNAL", "GOOGLE_DRIVE", "ONE_DRIVE", "LINK", "CAMERA"],
  shouldCompress = false,
  imageCompression = false,
  fileSizeLimit = 25,
  maxRetries,
  translations,
  thumbnailGenerator = false,
  onBeforeFileAdded,
}: Readonly<Props>) {
  // Detect dark mode using Tailwind's class strategy
  const { isDarkMode } = useContext(ThemeContext);

  // Convert string array to FileSource enum values
  const fileSources = enabledAdapters.map((adapter) => {
    switch (adapter) {
      case "INTERNAL":
        return FileSource.LOCAL;
      case "GOOGLE_DRIVE":
        return FileSource.GOOGLE_DRIVE;
      case "ONE_DRIVE":
        return FileSource.ONE_DRIVE;
      case "LINK":
        return FileSource.URL;
      case "CAMERA":
        return FileSource.CAMERA;
      case "DROPBOX":
        return FileSource.DROPBOX;
      case "AUDIO":
        return FileSource.MICROPHONE;
      case "SCREEN_CAPTURE":
        return FileSource.SCREEN;
      default:
        return FileSource.LOCAL;
    }
  });

  // Get the current theme
  const currentTheme = theme || "blue";

  // Custom class names for theming - these will use global CSS classes
  const customClassNames = {
    // Soft pastel backgrounds for containers
    containerMini: `uploader-container-mini-${currentTheme} `,
    containerFull: `uploader-container-full-${currentTheme}`,
    // Darker backgrounds for other elements
    fileListContainer: `uploader-file-list-${currentTheme}`,
    driveBody: `uploader-drive-body-${currentTheme}`,
    adapterView: `uploader-adapter-view-${currentTheme}`,
    // Button and interactive elements
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
        provider={StorageProvider.BackBlaze}
        limit={limit}
        uploadEndpoint={customFields.uploadEndpoint}
        fileSources={fileSources}
        driveConfigs={customFields.driveConfigs}
        dark={isDarkMode}
        mini={mini}
        shouldCompress={shouldCompress}
        imageCompression={imageCompression}
        thumbnailGenerator={thumbnailGenerator}
        maxFileSize={{ size: fileSizeLimit, unit: "MB" }}
        classNames={customClassNames}
        maxRetries={maxRetries}
        translations={translations}
        onBeforeFileAdded={onBeforeFileAdded}
      />
    </div>
  );
}
