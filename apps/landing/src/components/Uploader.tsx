"use client";

import React, {useContext} from "react";

import {UpupUploader, UpupProvider, UploadAdapter} from 'upup-react-file-uploader'

import "upup-react-file-uploader/styles";
import {ThemeContext} from "@/lib/contexts";
import {toast} from "react-toastify";

const customFields = {
    tokenEndpoint: process.env.NEXT_PUBLIC_BASE_URL 
        ? process.env.NEXT_PUBLIC_BASE_URL + "/api/getPresignedUrl"
        : "/api/getPresignedUrl", // fallback to relative path
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
    allowPreview?: boolean;
    shouldCompress?: boolean;
    fileSizeLimit?: number; // in MB
}

export default function Uploader({
                                     limit,
                                     mini,
                                     theme = "blue",
                                     enabledAdapters = ["INTERNAL", "GOOGLE_DRIVE", "ONE_DRIVE", "LINK", "CAMERA"],
                                     allowPreview = true,
                                     shouldCompress = false,
                                     fileSizeLimit = 25
                                 }: Readonly<Props>) {
    // Detect dark mode using Tailwind's class strategy
    const {isDarkMode} = useContext(ThemeContext)

    // Convert string array to UploadAdapter enum values
    const uploadAdapters = enabledAdapters.map(adapter => {
        switch(adapter) {
            case "INTERNAL": return UploadAdapter.INTERNAL;
            case "GOOGLE_DRIVE": return UploadAdapter.GOOGLE_DRIVE;
            case "ONE_DRIVE": return UploadAdapter.ONE_DRIVE;
            case "LINK": return UploadAdapter.LINK;
            case "CAMERA": return UploadAdapter.CAMERA;
            case "DROPBOX": return UploadAdapter.DROPBOX;
            default: return UploadAdapter.INTERNAL;
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
        adapterButtonIcon:`uploader-file-list-${currentTheme}`,
        adapterButtonText: `uploader-preview-${currentTheme}`,
    };

    return (
        <div className="flex justify-center items-center w-full h-full lg:min-h-[auto] min-h-[70vh]">
            <UpupUploader
                provider={UpupProvider.BackBlaze}
                limit={limit}
                tokenEndpoint={customFields.tokenEndpoint}
                uploadAdapters={uploadAdapters}
                driveConfigs={customFields.driveConfigs}
                dark={isDarkMode}
                mini={mini}
                allowPreview={allowPreview}
                shouldCompress={shouldCompress}
                maxFileSize={{ size: fileSizeLimit, unit: 'MB' }}
                classNames={customClassNames}
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
                    toast.error(`File type not supported. Accepted types: ${acceptedTypes}`);
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