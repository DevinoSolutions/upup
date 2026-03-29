"use client";

import Link from "next/link";
import React, {
  ChangeEventHandler,
  useCallback,
  useState,
  useEffect,
  useRef,
  useContext,
} from "react";
import {
  FaCog,
  FaExpand,
  FaCompress,
  FaFileAlt,
  FaArrowRight,
  FaPalette,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaBolt,
  FaCamera,
  FaGlobe,
  FaCloud,
  FaHdd,
  FaInfoCircle,
  FaShieldAlt,
  FaLanguage,
  FaCrop,
  FaRedo,
  FaMicrophone,
  FaDesktop,
  FaImage,
  FaTh,
} from "react-icons/fa";
import { SiDropbox, SiGoogledrive } from "react-icons/si";
import { GrOnedrive } from "react-icons/gr";
import type { Translations } from "@upup/shared";
import { en_US } from "@upup/shared";
import {
  ar_SA,
  de_DE,
  es_ES,
  fr_FR,
  ja_JP,
  ko_KR,
  zh_CN,
  zh_TW,
} from "@upup/react/locales";
import Uploader from "@/components/Uploader";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";
import { Play, Zap } from "lucide-react";
import { ThemeContext } from "@/lib/contexts";

const UPUP_LIMIT_DEFAULT = 1;
const UPUP_LIMIT_MIN = 1;
const UPUP_LIMIT_MAX = 30;

// File size limits - now as separate number and unit
const FILE_SIZE_UNITS = [
  { value: 1, label: "B" },
  { value: 1024, label: "KB" },
  { value: 1024 * 1024, label: "MB" },
  { value: 1024 * 1024 * 1024, label: "GB" },
];

// Color themes for the uploader
const COLOR_THEMES = {
  blue: {
    name: "Blue",
    class: "theme-blue",
  },
  emerald: {
    name: "Emerald",
    class: "theme-emerald",
  },
  purple: {
    name: "Purple",
    class: "theme-purple",
  },
  rose: {
    name: "Rose",
    class: "theme-rose",
  },
  orange: {
    name: "Orange",
    class: "theme-orange",
  },
  indigo: {
    name: "Indigo",
    class: "theme-indigo",
  },
};

// Upload adapter options
const UPLOAD_ADAPTERS = [
  { value: "INTERNAL", label: "Local Files", icon: FaCloud },
  { value: "GOOGLE_DRIVE", label: "Google Drive", icon: SiGoogledrive },
  { value: "ONE_DRIVE", label: "OneDrive", icon: GrOnedrive },
  { value: "LINK", label: "URL Links", icon: FaGlobe },
  { value: "CAMERA", label: "Camera", icon: FaCamera },
  { value: "DROPBOX", label: "Dropbox", icon: SiDropbox },
  { value: "AUDIO", label: "Audio", icon: FaMicrophone },
  { value: "SCREEN_CAPTURE", label: "Screen Capture", icon: FaDesktop },
];

// Available languages for the locale selector
const LANGUAGES: { code: string; label: string; locale: Translations }[] = [
  { code: "en_US", label: "English", locale: en_US },
  { code: "fr_FR", label: "Français", locale: fr_FR },
  { code: "de_DE", label: "Deutsch", locale: de_DE },
  { code: "es_ES", label: "Español", locale: es_ES },
  { code: "ja_JP", label: "日本語", locale: ja_JP },
  { code: "ko_KR", label: "한국어", locale: ko_KR },
  { code: "zh_CN", label: "简体中文", locale: zh_CN },
  { code: "zh_TW", label: "繁體中文", locale: zh_TW },
  { code: "ar_SA", label: "العربية", locale: ar_SA },
];

export default function HomepageDemo() {
  const { isDarkMode } = useContext(ThemeContext);
  const [mini, setMini] = useState(false);
  const [mobileMode, setMobileMode] = useState(false);
  const [limit, setLimit] = useState(UPUP_LIMIT_DEFAULT);
  const [selectedTheme, setSelectedTheme] = useState("blue");
  const [enabledAdapters, setEnabledAdapters] = useState([
    "INTERNAL",
    "GOOGLE_DRIVE",
    "ONE_DRIVE",
    "LINK",
    "CAMERA",
  ]);
  const [allowPreview, setAllowPreview] = useState(true);
  const [shouldCompress, setShouldCompress] = useState(false);
  const [imageCompression, setImageCompression] = useState(false);
  const [imageEditor, setImageEditor] = useState(false);
  const [thumbnailGenerator, setThumbnailGenerator] = useState(false);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(3);
  const [selectedLanguage, setSelectedLanguage] = useState("en_US");
  const [fileSizeValue, setFileSizeValue] = useState(25); // Default 25
  const [fileSizeUnit, setFileSizeUnit] = useState(1024 * 1024); // Default MB
  const [minFileSizeValue, setMinFileSizeValue] = useState(0); // Default 0 (disabled)
  const [minFileSizeUnit, setMinFileSizeUnit] = useState(1024); // Default KB
  const [maxTotalFileSizeValue, setMaxTotalFileSizeValue] = useState(0); // Default 0 (disabled)
  const [maxTotalFileSizeUnit, setMaxTotalFileSizeUnit] = useState(1024 * 1024); // Default MB
  const [note, setNote] = useState("");
  const [hideUploadButton, setHideUploadButton] = useState(false);
  const [disableLocalFiles, setDisableLocalFiles] = useState(false);
  const [showRemoveButtonAfterComplete, setShowRemoveButtonAfterComplete] = useState(true);
  const [onBeforeFileAddedEnabled, setOnBeforeFileAddedEnabled] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [hideCancelButton, setHideCancelButton] = useState(false);
  const [hidePauseResumeButton, setHidePauseResumeButton] = useState(false);
  const [hideProgressAfterFinish, setHideProgressAfterFinish] = useState(false);
  const [hideRetryButton, setHideRetryButton] = useState(false);
  const [disableInformer, setDisableInformer] = useState(false);
  const [showSelectedFiles, setShowSelectedFiles] = useState(true);
  const [allowMultipleUploadBatches, setAllowMultipleUploadBatches] = useState(true);
  const [onBeforeUploadEnabled, setOnBeforeUploadEnabled] = useState(false);
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(false); // New state for restrictions toggle
  const [iframeLoading, setIframeLoading] = useState(false); // Loading state for iframe
  const [currentIframeUrl, setCurrentIframeUrl] = useState(""); // Track current iframe URL

  // Calculate file size limit in bytes for the uploader
  const fileSizeLimit = Math.floor(
    (fileSizeValue * fileSizeUnit) / (1024 * 1024),
  ); // Convert to MB for uploader

  // Get min file size unit label
  const getMinFileSizeUnitLabel = () => {
    const unit = FILE_SIZE_UNITS.find((u) => u.value === minFileSizeUnit);
    return unit?.label || 'KB';
  };

  // Get max total file size unit label
  const getMaxTotalFileSizeUnitLabel = () => {
    const unit = FILE_SIZE_UNITS.find((u) => u.value === maxTotalFileSizeUnit);
    return unit?.label || 'MB';
  };

  // Generate iframe URL with current settings
  const generateMobileDemoUrl = () => {
    const params = new URLSearchParams({
      limit: (restrictionsEnabled ? limit : 99).toString(),
      mini: mini.toString(),
      theme: selectedTheme,
      enabledAdapters: enabledAdapters.join(","),
      allowPreview: allowPreview.toString(),
      shouldCompress: shouldCompress.toString(),
      imageCompression: imageCompression.toString(),
      imageEditor: imageEditor.toString(),
      thumbnailGenerator: thumbnailGenerator.toString(),
      autoRetryEnabled: autoRetryEnabled.toString(),
      autoRetryCount: autoRetryCount.toString(),
      fileSizeLimit: (restrictionsEnabled ? fileSizeLimit : 999).toString(),
      minFileSizeValue: (restrictionsEnabled && minFileSizeValue > 0 ? minFileSizeValue : 0).toString(),
      minFileSizeUnit: getMinFileSizeUnitLabel(),
      maxTotalFileSizeValue: (restrictionsEnabled && maxTotalFileSizeValue > 0 ? maxTotalFileSizeValue : 0).toString(),
      maxTotalFileSizeUnit: getMaxTotalFileSizeUnitLabel(),
      darkMode: isDarkMode.toString(),
      language: selectedLanguage,
      note,
      hideUploadButton: hideUploadButton.toString(),
      disableLocalFiles: disableLocalFiles.toString(),
      showRemoveButtonAfterComplete: showRemoveButtonAfterComplete.toString(),
      onBeforeFileAddedEnabled: onBeforeFileAddedEnabled.toString(),
      disabled: disabled.toString(),
      hideCancelButton: hideCancelButton.toString(),
      hidePauseResumeButton: hidePauseResumeButton.toString(),
      hideProgressAfterFinish: hideProgressAfterFinish.toString(),
      hideRetryButton: hideRetryButton.toString(),
      disableInformer: disableInformer.toString(),
      showSelectedFiles: showSelectedFiles.toString(),
      allowMultipleUploadBatches: allowMultipleUploadBatches.toString(),
      onBeforeUploadEnabled: onBeforeUploadEnabled.toString(),
    });
    return `/mobile-demo?${params.toString()}`;
  };

  // Track iframe URL changes and show loader
  useEffect(() => {
    if (mobileMode) {
      const newUrl = generateMobileDemoUrl();
      if (currentIframeUrl && newUrl !== currentIframeUrl) {
        setIframeLoading(true);
        // Show loader for 800ms to mask the glitch
        const timer = setTimeout(() => {
          setIframeLoading(false);
        }, 800);
        return () => clearTimeout(timer);
      }
      setCurrentIframeUrl(newUrl);
    }
  }, [
    mini,
    selectedTheme,
    enabledAdapters,
    allowPreview,
    shouldCompress,
    imageCompression,
    imageEditor,
    thumbnailGenerator,
    autoRetryEnabled,
    autoRetryCount,
    restrictionsEnabled,
    limit,
    fileSizeValue,
    fileSizeUnit,
    minFileSizeValue,
    minFileSizeUnit,
    maxTotalFileSizeValue,
    maxTotalFileSizeUnit,
    isDarkMode,
    mobileMode,
    selectedLanguage,
    note,
    hideUploadButton,
    disableLocalFiles,
    showRemoveButtonAfterComplete,
    onBeforeFileAddedEnabled,
    disabled,
    hideCancelButton,
    hidePauseResumeButton,
    hideProgressAfterFinish,
    hideRetryButton,
    disableInformer,
    showSelectedFiles,
    allowMultipleUploadBatches,
    onBeforeUploadEnabled,
  ]);

  const handleMiniChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (!mini) setLimit(1);
      setMini(e.currentTarget.checked);
    },
    [mini],
  );

  const handleThemeChange = useCallback((theme: string) => {
    setSelectedTheme(theme);
  }, []);

  const handleAdapterToggle = useCallback((adapter: string) => {
    setEnabledAdapters((prev) =>
      prev.includes(adapter)
        ? prev.filter((a) => a !== adapter)
        : [...prev, adapter],
    );
  }, []);

  return (
    <section
      id="demo"
      className="py-24 px-6 relative overflow-hidden rounded-xl"
    >
      {/* Add custom CSS for color themes and mobile simulation */}
      <style jsx>{`
        .theme-blue {
          background-color: #3b82f6;
        }
        .theme-emerald {
          background-color: #10b981;
        }
        .theme-purple {
          background-color: #8b5cf6;
        }
        .theme-rose {
          background-color: #f43f5e;
        }
        .theme-orange {
          background-color: #f97316;
        }
        .theme-indigo {
          background-color: #6366f1;
        }

        .theme-blue:hover {
          background-color: #2563eb;
        }
        .theme-emerald:hover {
          background-color: #059669;
        }
        .theme-purple:hover {
          background-color: #7c3aed;
        }
        .theme-rose:hover {
          background-color: #e11d48;
        }
        .theme-orange:hover {
          background-color: #ea580c;
        }
        .theme-indigo:hover {
          background-color: #4f46e5;
        }

        .mobile-iframe {
          width: 375px;
          height: 650px;
          border-radius: 12px;
          max-width: 375px;
          overflow: hidden;
        }
      `}</style>

      <div className="relative max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 mb-6">
            <Play className="w-4 h-4 text-primary dark:text-primary-dark" />
            Interactive Demo
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Try the interactive example
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Customize the UI, drag & drop files, and test our TypeScript npm
            package with different themes and settings.
          </p>
        </div>

        <div className="flex min-h-[70vh] lg:flex-row md:flex-col flex-col gap-8">
          {/* Controls Panel */}
          <div className="lg:w-2/5 w-full">
            <div className="space-y-3">
              {/* Configuration Card */}
              <div className="shadow-md dark:shadow-none p-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 bg-primary/10 dark:bg-primary-dark/10 rounded-xl flex items-center justify-center">
                    <FaCog className="w-4 h-4 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Settings
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Mini Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {mini ? (
                        <FaCompress className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <FaExpand className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                      <div>
                        <label
                          htmlFor="mini"
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer flex items-center gap-1"
                          data-tooltip-id="mini-tooltip"
                          data-tooltip-content="Compact mode with simplified interface and single file upload"
                        >
                          <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                          Mini Mode
                        </label>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="mini"
                        type="checkbox"
                        checked={mini}
                        onChange={handleMiniChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Mobile Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaHdd className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div>
                        <label
                          htmlFor="mobileMode"
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer flex items-center gap-1"
                          data-tooltip-id="mobile-tooltip"
                          data-tooltip-content="Force mobile view with real mobile viewport simulation"
                        >
                          <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                          Mobile Mode
                        </label>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="mobileMode"
                        type="checkbox"
                        checked={mobileMode}
                        onChange={(e) => setMobileMode(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Restrictions - Responsive Toggle and Inline Layout */}
                  <div className="space-y-3">
                    {/* Toggle - Inline until xl, then responsive */}
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FaShieldAlt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          Restrictions
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          checked={restrictionsEnabled}
                          onChange={(e) =>
                            setRestrictionsEnabled(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                      </label>
                    </div>

                    {/* Animated Restrictions Content - Inline until xl */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        restrictionsEnabled
                          ? "max-h-40 opacity-100 transform translate-x-0"
                          : "max-h-0 opacity-0 transform -translate-x-4"
                      }`}
                    >
                      <div className="pt-2">
                        {/* Inline layout until xl breakpoint */}
                        <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                          {/* File Limit */}
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor="fileLimit"
                              className="text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              File Limit
                            </label>
                            <input
                              type="number"
                              id="fileLimit"
                              value={limit}
                              onChange={(e) =>
                                setLimit(
                                  Math.max(
                                    UPUP_LIMIT_MIN,
                                    Math.min(
                                      UPUP_LIMIT_MAX,
                                      Number(e.target.value) || UPUP_LIMIT_MIN,
                                    ),
                                  ),
                                )
                              }
                              min={UPUP_LIMIT_MIN}
                              max={UPUP_LIMIT_MAX}
                              disabled={mini}
                              className="w-full xl:w-20 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              placeholder="1-30"
                            />
                          </div>

                          {/* Max File Size */}
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor="fileSizeValue"
                              className="text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              Max Size
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                id="fileSizeValue"
                                value={fileSizeValue}
                                onChange={(e) =>
                                  setFileSizeValue(
                                    Math.max(1, Number(e.target.value) || 1),
                                  )
                                }
                                min="1"
                                className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                                placeholder="25"
                              />
                              <select
                                value={fileSizeUnit}
                                onChange={(e) =>
                                  setFileSizeUnit(Number(e.target.value))
                                }
                                className="px-2 py-1 min-w-[60px] text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                              >
                                {FILE_SIZE_UNITS.map((unit) => (
                                  <option
                                    key={unit.value}
                                    value={unit.value}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  >
                                    {unit.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Min File Size */}
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor="minFileSizeValue"
                              className="text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              Min Size
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                id="minFileSizeValue"
                                value={minFileSizeValue}
                                onChange={(e) =>
                                  setMinFileSizeValue(
                                    Math.max(0, Number(e.target.value) || 0),
                                  )
                                }
                                min="0"
                                className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                                placeholder="0"
                              />
                              <select
                                value={minFileSizeUnit}
                                onChange={(e) =>
                                  setMinFileSizeUnit(Number(e.target.value))
                                }
                                className="px-2 py-1 min-w-[60px] text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                              >
                                {FILE_SIZE_UNITS.map((unit) => (
                                  <option
                                    key={unit.value}
                                    value={unit.value}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  >
                                    {unit.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Max Total File Size */}
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor="maxTotalFileSizeValue"
                              className="text-xs font-medium text-gray-700 dark:text-gray-300"
                            >
                              Max Total
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                id="maxTotalFileSizeValue"
                                value={maxTotalFileSizeValue}
                                onChange={(e) =>
                                  setMaxTotalFileSizeValue(
                                    Math.max(0, Number(e.target.value) || 0),
                                  )
                                }
                                min="0"
                                className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                                placeholder="0"
                              />
                              <select
                                value={maxTotalFileSizeUnit}
                                onChange={(e) =>
                                  setMaxTotalFileSizeUnit(Number(e.target.value))
                                }
                                className="px-2 py-1 min-w-[60px] text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                              >
                                {FILE_SIZE_UNITS.map((unit) => (
                                  <option
                                    key={unit.value}
                                    value={unit.value}
                                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                  >
                                    {unit.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {mini && (
                    <div className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
                      <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-1.5 h-1.5 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
                      </div>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        File limit auto-set to 1 in mini mode
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Color Theme Card */}
              <div className="shadow-md dark:shadow-none p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary-dark/10 rounded-lg flex items-center justify-center">
                    <FaPalette className="w-3.5 h-3.5 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Theme
                  </h3>
                </div>

                <div className="flex gap-1.5">
                  {Object.entries(COLOR_THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      className={`w-8 h-8 rounded-lg transition-all duration-200 ${
                        theme.class
                      } ${
                        selectedTheme === key
                          ? "ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800 shadow-lg scale-110"
                          : "opacity-70 hover:opacity-100 hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Upload Sources Card */}
              <div
                className={`shadow-md dark:shadow-none p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 ${
                  mini ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary-dark/10 rounded-lg flex items-center justify-center">
                    <FaUpload className="w-3.5 h-3.5 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Sources
                  </h3>
                  {mini && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
                      Disabled in mini mode
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  {UPLOAD_ADAPTERS.map((adapter) => (
                    <button
                      key={adapter.value}
                      onClick={() =>
                        !mini && handleAdapterToggle(adapter.value)
                      }
                      disabled={mini}
                      className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                        mini
                          ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                          : enabledAdapters.includes(adapter.value)
                          ? "border-primary bg-primary/10 dark:bg-primary-dark/10"
                          : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      <adapter.icon
                        className={`w-4 h-4 ${
                          mini
                            ? "text-gray-400 dark:text-gray-600"
                            : enabledAdapters.includes(adapter.value)
                            ? "text-primary dark:text-primary-dark"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional Options Card */}
              <div className="shadow-md dark:shadow-none p-5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-primary/10 dark:bg-primary-dark/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-4 h-4 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Options
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaEye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="preview-tooltip"
                        data-tooltip-content="Enable file preview functionality to view images, documents, and other files before uploading"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Preview
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowPreview}
                        onChange={(e) => setAllowPreview(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaBolt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="compress-tooltip"
                        data-tooltip-content="Automatically compress images to reduce file size while maintaining quality for faster uploads"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Compress
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shouldCompress}
                        onChange={(e) => setShouldCompress(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaImage className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="image-compression-tooltip"
                        data-tooltip-content="Compress images using canvas-based quality and dimension reduction before uploading"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Image Compression
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={imageCompression}
                        onChange={(e) => setImageCompression(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaCrop className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="image-editor-tooltip"
                        data-tooltip-content="Open an image editor to crop, rotate, resize, and apply filters before uploading"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Image Editor
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={imageEditor}
                        onChange={(e) => setImageEditor(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaTh className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="thumbnail-generator-tooltip"
                        data-tooltip-content="Generate smaller thumbnail previews for image files before uploading"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Thumbnail Generator
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={thumbnailGenerator}
                        onChange={(e) => setThumbnailGenerator(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FaRedo className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <div
                          className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                          data-tooltip-id="autoretry-tooltip"
                          data-tooltip-content="Automatically retry failed uploads before showing an error. When disabled, a manual retry button appears on failure."
                        >
                          <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                          Auto Retry
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRetryEnabled}
                          onChange={(e) =>
                            setAutoRetryEnabled(e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                      </label>
                    </div>
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        autoRetryEnabled
                          ? "max-h-20 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="flex items-center gap-2 pl-6">
                        <label
                          htmlFor="retryCount"
                          className="text-xs font-medium text-gray-700 dark:text-gray-300"
                        >
                          Retries
                        </label>
                        <input
                          type="number"
                          id="retryCount"
                          value={autoRetryCount}
                          onChange={(e) =>
                            setAutoRetryCount(
                              Math.max(
                                1,
                                Math.min(10, Number(e.target.value) || 1),
                              ),
                            )
                          }
                          min="1"
                          max="10"
                          className="w-16 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Options Card */}
              <div className="shadow-md dark:shadow-none p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary-dark/10 rounded-lg flex items-center justify-center">
                    <FaCog className="w-3.5 h-3.5 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Advanced Options
                  </h3>
                </div>
                <div className="space-y-3">
                  {/* Note */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FaFileAlt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="note-tooltip"
                        data-tooltip-content="Informational text shown in the upload area"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Note
                      </div>
                    </div>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Images only, up to 5 MB"
                      className="w-full px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* Hide Upload Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUpload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="hideUploadButton-tooltip"
                        data-tooltip-content="Hide the upload button from the file list"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Hide Upload Button
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideUploadButton}
                        onChange={(e) => setHideUploadButton(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Disable Local Files */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaHdd className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="disableLocalFiles-tooltip"
                        data-tooltip-content="Disable selecting files from the local device"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Disable Local Files
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disableLocalFiles}
                        onChange={(e) => setDisableLocalFiles(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Show Remove Button After Complete */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaEye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="showRemoveButtonAfterComplete-tooltip"
                        data-tooltip-content="Show the remove button on files after upload completes"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Remove After Complete
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showRemoveButtonAfterComplete}
                        onChange={(e) =>
                          setShowRemoveButtonAfterComplete(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* onBeforeFileAdded */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaShieldAlt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="onBeforeFileAdded-tooltip"
                        data-tooltip-content="Enable a callback that rejects hidden files (starting with '.')"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        onBeforeFileAdded
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onBeforeFileAddedEnabled}
                        onChange={(e) =>
                          setOnBeforeFileAddedEnabled(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* onBeforeUpload */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaShieldAlt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="onBeforeUpload-tooltip"
                        data-tooltip-content="Enable a callback that fires before upload starts"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        onBeforeUpload
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onBeforeUploadEnabled}
                        onChange={(e) =>
                          setOnBeforeUploadEnabled(e.target.checked)
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Disabled */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaBolt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="disabled-tooltip"
                        data-tooltip-content="Disable the uploader entirely"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Disabled
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disabled}
                        onChange={(e) => setDisabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Hide Cancel Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaInfoCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="hideCancelButton-tooltip"
                        data-tooltip-content="Hide the cancel button during uploads"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Hide Cancel Button
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideCancelButton}
                        onChange={(e) => setHideCancelButton(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Hide Pause/Resume Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaInfoCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="hidePauseResumeButton-tooltip"
                        data-tooltip-content="Hide the pause/resume button during uploads"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Hide Pause/Resume
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hidePauseResumeButton}
                        onChange={(e) => setHidePauseResumeButton(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Hide Progress After Finish */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaEye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="hideProgressAfterFinish-tooltip"
                        data-tooltip-content="Hide the progress bar after upload finishes"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Hide Progress After Finish
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideProgressAfterFinish}
                        onChange={(e) => setHideProgressAfterFinish(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Hide Retry Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaEyeSlash className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="hideRetryButton-tooltip"
                        data-tooltip-content="Hide the retry button when uploads fail"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Hide Retry Button
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideRetryButton}
                        onChange={(e) => setHideRetryButton(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Disable Informer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaEyeSlash className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="disableInformer-tooltip"
                        data-tooltip-content="Disable the notification bar — use your own notification system"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Disable Informer
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={disableInformer}
                        onChange={(e) => setDisableInformer(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Show Selected Files */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaFileAlt className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="showSelectedFiles-tooltip"
                        data-tooltip-content="Show the list of selected files"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Show Selected Files
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSelectedFiles}
                        onChange={(e) => setShowSelectedFiles(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>

                  {/* Allow Multiple Upload Batches */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUpload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <div
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help flex items-center gap-1"
                        data-tooltip-id="allowMultipleUploadBatches-tooltip"
                        data-tooltip-content="Allow adding more files after the first upload batch"
                      >
                        <FaInfoCircle className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                        Multiple Batches
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowMultipleUploadBatches}
                        onChange={(e) => setAllowMultipleUploadBatches(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Language Card */}
              <div className="shadow-md dark:shadow-none p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-primary/10 dark:bg-primary-dark/10 rounded-lg flex items-center justify-center">
                    <FaLanguage className="w-3.5 h-3.5 text-primary dark:text-primary-dark" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    Language
                  </h3>
                </div>

                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option
                      key={lang.code}
                      value={lang.code}
                      className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Documentation Link Card */}
              <div className="p-4 bg-gradient-to-r from-primary/5 to-primary-dark/5 dark:from-primary-dark/10 dark:to-primary/10 border border-primary/20 dark:border-primary-dark/20 rounded-xl hover:from-primary/10 hover:to-primary-dark/10 dark:hover:from-primary-dark/20 dark:hover:to-primary/20 transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      More options?
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Check the full docs
                    </p>
                  </div>
                  <Link
                    href="/documentation"
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-primary dark:text-primary-dark rounded-lg text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 group"
                  >
                    Docs
                    <FaArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Live Demo Panel */}
          <div className="lg:w-3/5 w-full">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  Live Preview
                </h3>
              </div>

              <div className="p-1 bg-gradient-to-r from-primary/20 to-primary-dark/20 rounded-3xl">
                <div className="bg-white dark:bg-gray-900 rounded-[22px] lg:p-6 p-2 transition-all duration-300 relative">
                  {mobileMode ? (
                    <div className="relative">
                      <iframe
                        src={generateMobileDemoUrl()}
                        className="mobile-iframe mx-auto"
                        title="Mobile Demo"
                        frameBorder="0"
                        allowFullScreen
                      />
                      {/* Loading overlay for iframe */}
                      {iframeLoading && (
                        <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center rounded-xl">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary dark:border-primary-dark"></div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Loading demo...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Uploader
                      limit={restrictionsEnabled ? limit : 99}
                      mini={mini}
                      theme={selectedTheme}
                      enabledAdapters={enabledAdapters}
                      shouldCompress={shouldCompress}
                      imageCompression={imageCompression}
                      thumbnailGenerator={thumbnailGenerator}
                      fileSizeLimit={restrictionsEnabled ? fileSizeLimit : 999}
                      minFileSizeValue={restrictionsEnabled && minFileSizeValue > 0 ? minFileSizeValue : undefined}
                      minFileSizeUnit={restrictionsEnabled && minFileSizeValue > 0 ? getMinFileSizeUnitLabel() : undefined}
                      maxTotalFileSizeValue={restrictionsEnabled && maxTotalFileSizeValue > 0 ? maxTotalFileSizeValue : undefined}
                      maxTotalFileSizeUnit={restrictionsEnabled && maxTotalFileSizeValue > 0 ? getMaxTotalFileSizeUnitLabel() : undefined}
                      maxRetries={autoRetryEnabled ? autoRetryCount : undefined}
                      translations={
                        LANGUAGES.find((l) => l.code === selectedLanguage)
                          ?.locale
                      }
                      onBeforeFileAdded={onBeforeFileAddedEnabled ? (file: File) => {
                        if (file.name.startsWith('.')) {
                          alert(`Hidden file "${file.name}" was rejected by onBeforeFileAdded`);
                          return false;
                        }
                        return true;
                      } : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip components */}
      <Tooltip id="mini-tooltip" className="z-50" />
      <Tooltip id="mobile-tooltip" className="z-50" />
      <Tooltip id="preview-tooltip" className="z-50" />
      <Tooltip id="compress-tooltip" className="z-50" />
      <Tooltip id="image-compression-tooltip" className="z-50" />
      <Tooltip id="image-editor-tooltip" className="z-50" />
      <Tooltip id="thumbnail-generator-tooltip" className="z-50" />
      <Tooltip id="autoretry-tooltip" className="z-50" />
      <Tooltip id="note-tooltip" className="z-50" />
      <Tooltip id="hideUploadButton-tooltip" className="z-50" />
      <Tooltip id="disableLocalFiles-tooltip" className="z-50" />
      <Tooltip id="showRemoveButtonAfterComplete-tooltip" className="z-50" />
      <Tooltip id="onBeforeFileAdded-tooltip" className="z-50" />
      <Tooltip id="onBeforeUpload-tooltip" className="z-50" />
      <Tooltip id="disabled-tooltip" className="z-50" />
      <Tooltip id="hideCancelButton-tooltip" className="z-50" />
      <Tooltip id="hidePauseResumeButton-tooltip" className="z-50" />
      <Tooltip id="hideProgressAfterFinish-tooltip" className="z-50" />
      <Tooltip id="showSelectedFiles-tooltip" className="z-50" />
      <Tooltip id="hideRetryButton-tooltip" className="z-50" />
      <Tooltip id="disableInformer-tooltip" className="z-50" />
      <Tooltip id="allowMultipleUploadBatches-tooltip" className="z-50" />
    </section>
  );
}
