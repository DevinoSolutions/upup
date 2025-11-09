"use client";

import Link from "next/link";
import React, { ChangeEventHandler, useCallback, useState, useEffect, useRef, useContext } from "react";
import {
  FaCog,
  FaExpand,
  FaCompress,
  FaFileAlt,
  FaArrowRight,
  FaPalette,
  FaUpload,
  FaEye,
  FaBolt,
  FaCamera,
  FaGlobe,
  FaCloud,
  FaHdd,
  FaInfoCircle,
  FaShieldAlt
} from "react-icons/fa";
import { SiDropbox, SiGoogledrive } from "react-icons/si";
import { GrOnedrive } from "react-icons/gr";
import Uploader from "@/components/Uploader";
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import {Play, Zap} from "lucide-react";
import { ThemeContext } from "@/lib/contexts";

const UPUP_LIMIT_DEFAULT = 1;
const UPUP_LIMIT_MIN = 1;
const UPUP_LIMIT_MAX = 30;

// File size limits - now as separate number and unit
const FILE_SIZE_UNITS = [
  { value: 1, label: "B" },
  { value: 1024, label: "KB" },
  { value: 1024 * 1024, label: "MB" },
  { value: 1024 * 1024 * 1024, label: "GB" }
];

// Color themes for the uploader
const COLOR_THEMES = {
  blue: {
    name: "Blue",
    class: "theme-blue"
  },
  emerald: {
    name: "Emerald",
    class: "theme-emerald"
  },
  purple: {
    name: "Purple",
    class: "theme-purple"
  },
  rose: {
    name: "Rose",
    class: "theme-rose"
  },
  orange: {
    name: "Orange",
    class: "theme-orange"
  },
  indigo: {
    name: "Indigo",
    class: "theme-indigo"
  }
};

// Upload adapter options
const UPLOAD_ADAPTERS = [
  { value: "INTERNAL", label: "Local Files", icon: FaCloud },
  { value: "GOOGLE_DRIVE", label: "Google Drive", icon: SiGoogledrive },
  { value: "ONE_DRIVE", label: "OneDrive", icon: GrOnedrive },
  { value: "LINK", label: "URL Links", icon: FaGlobe },
  { value: "CAMERA", label: "Camera", icon: FaCamera },
  { value: "DROPBOX", label: "Dropbox", icon: SiDropbox }
];

export default function HomepageDemo() {
  const { isDarkMode } = useContext(ThemeContext);
  const [mini, setMini] = useState(false);
  const [mobileMode, setMobileMode] = useState(false);
  const [limit, setLimit] = useState(UPUP_LIMIT_DEFAULT);
  const [selectedTheme, setSelectedTheme] = useState("blue");
  const [enabledAdapters, setEnabledAdapters] = useState(["INTERNAL", "GOOGLE_DRIVE", "ONE_DRIVE", "LINK", "CAMERA"]);
  const [allowPreview, setAllowPreview] = useState(true);
  const [shouldCompress, setShouldCompress] = useState(false);
  const [fileSizeValue, setFileSizeValue] = useState(25); // Default 25
  const [fileSizeUnit, setFileSizeUnit] = useState(1024 * 1024); // Default MB
  const [restrictionsEnabled, setRestrictionsEnabled] = useState(false); // New state for restrictions toggle
  const [iframeLoading, setIframeLoading] = useState(false); // Loading state for iframe
  const [currentIframeUrl, setCurrentIframeUrl] = useState(""); // Track current iframe URL

  // Generate iframe URL with current settings
  const generateMobileDemoUrl = () => {
    const params = new URLSearchParams({
      limit: (restrictionsEnabled ? limit : 99).toString(),
      mini: mini.toString(),
      theme: selectedTheme,
      enabledAdapters: enabledAdapters.join(','),
      allowPreview: allowPreview.toString(),
      shouldCompress: shouldCompress.toString(),
      fileSizeLimit: (restrictionsEnabled ? fileSizeLimit : 999).toString(),
      darkMode: isDarkMode.toString(), // Add dark mode parameter
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
  }, [mini, selectedTheme, enabledAdapters, allowPreview, shouldCompress, restrictionsEnabled, limit, fileSizeValue, fileSizeUnit, isDarkMode, mobileMode]);

  // Calculate file size limit in bytes for the uploader
  const fileSizeLimit = Math.floor((fileSizeValue * fileSizeUnit) / (1024 * 1024)); // Convert to MB for uploader

  const handleMiniChange: ChangeEventHandler<HTMLInputElement> = useCallback(
      (e) => {
        if (!mini) setLimit(1);
        setMini(e.currentTarget.checked);
      },
      [mini]
  );

  const handleThemeChange = useCallback((theme: string) => {
    setSelectedTheme(theme);
  }, []);

  const handleAdapterToggle = useCallback((adapter: string) => {
    setEnabledAdapters(prev =>
        prev.includes(adapter)
            ? prev.filter(a => a !== adapter)
            : [...prev, adapter]
    );
  }, []);

  return (
      <section id="demo" className="py-24 px-6 relative overflow-hidden rounded-xl">
        {/* Add custom CSS for color themes and mobile simulation */}
        <style jsx>{`
          .theme-blue { background-color: #3B82F6; }
          .theme-emerald { background-color: #10B981; }
          .theme-purple { background-color: #8B5CF6; }
          .theme-rose { background-color: #F43F5E; }
          .theme-orange { background-color: #F97316; }
          .theme-indigo { background-color: #6366F1; }

          .theme-blue:hover { background-color: #2563EB; }
          .theme-emerald:hover { background-color: #059669; }
          .theme-purple:hover { background-color: #7C3AED; }
          .theme-rose:hover { background-color: #E11D48; }
          .theme-orange:hover { background-color: #EA580C; }
          .theme-indigo:hover { background-color: #4F46E5; }

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
              Try it yourself
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Customize and test our uploader component with different themes, adapters, and settings.
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
                              onChange={(e) => setRestrictionsEnabled(e.target.checked)}
                              className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary-dark/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-md dark:border-gray-600 peer-checked:bg-primary dark:peer-checked:bg-primary-dark"></div>
                        </label>
                      </div>

                      {/* Animated Restrictions Content - Inline until xl */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        restrictionsEnabled 
                          ? 'max-h-40 opacity-100 transform translate-x-0' 
                          : 'max-h-0 opacity-0 transform -translate-x-4'
                      }`}>
                        <div className="pt-2">
                          {/* Inline layout until xl breakpoint */}
                          <div className="flex flex-col xl:flex-row xl:items-center gap-2">
                            {/* File Limit */}
                            <div className="flex flex-col gap-1">
                              <label htmlFor="fileLimit" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                File Limit
                              </label>
                              <input
                                  type="number"
                                  id="fileLimit"
                                  value={limit}
                                  onChange={(e) => setLimit(Math.max(UPUP_LIMIT_MIN, Math.min(UPUP_LIMIT_MAX, Number(e.target.value) || UPUP_LIMIT_MIN)))}
                                  min={UPUP_LIMIT_MIN}
                                  max={UPUP_LIMIT_MAX}
                                  disabled={mini}
                                  className="w-full xl:w-20 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="1-30"
                              />
                            </div>

                            {/* Max File Size */}
                            <div className="flex flex-col gap-1">
                              <label htmlFor="fileSizeValue" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                Max Size
                              </label>
                              <div className="flex gap-1">
                                <input
                                    type="number"
                                    id="fileSizeValue"
                                    value={fileSizeValue}
                                    onChange={(e) => setFileSizeValue(Math.max(1, Number(e.target.value) || 1))}
                                    min="1"
                                    className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                                    placeholder="25"
                                />
                                <select
                                    value={fileSizeUnit}
                                    onChange={(e) => setFileSizeUnit(Number(e.target.value))}
                                    className="px-2 py-1 min-w-[60px] text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-primary/20 dark:focus:ring-primary-dark/20 focus:border-primary dark:focus:border-primary-dark transition-colors text-gray-900 dark:text-white"
                                >
                                  {FILE_SIZE_UNITS.map((unit) => (
                                      <option key={unit.value} value={unit.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
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
                            className={`w-8 h-8 rounded-lg transition-all duration-200 ${theme.class} ${
                                selectedTheme === key
                                    ? "ring-2 ring-offset-2 ring-white dark:ring-offset-gray-800 shadow-lg scale-110"
                                    : "opacity-70 hover:opacity-100 hover:scale-105"
                            }`}
                        />
                    ))}
                  </div>
                </div>

                {/* Upload Sources Card */}
                <div className={`shadow-md dark:shadow-none p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-300 ${mini ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-primary/10 dark:bg-primary-dark/10 rounded-lg flex items-center justify-center">
                      <FaUpload className="w-3.5 h-3.5 text-primary dark:text-primary-dark" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Sources
                    </h3>
                    {mini && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">Disabled in mini mode</span>
                    )}
                  </div>

                  <div className="flex gap-1.5">
                    {UPLOAD_ADAPTERS.map((adapter) => (
                        <button
                            key={adapter.value}
                            onClick={() => !mini && handleAdapterToggle(adapter.value)}
                            disabled={mini}
                            className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                                mini
                                    ? "border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                    : enabledAdapters.includes(adapter.value)
                                        ? "border-primary bg-primary/10 dark:bg-primary-dark/10"
                                        : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                            }`}
                        >
                          <adapter.icon className={`w-4 h-4 ${
                              mini
                                  ? "text-gray-400 dark:text-gray-600"
                                  : enabledAdapters.includes(adapter.value)
                                      ? "text-primary dark:text-primary-dark"
                                      : "text-gray-600 dark:text-gray-400"
                          }`} />
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
                  </div>
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
                              <p className="text-sm text-gray-600 dark:text-gray-400">Loading demo...</p>
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
                          allowPreview={allowPreview}
                          shouldCompress={shouldCompress}
                          fileSizeLimit={restrictionsEnabled ? fileSizeLimit : 999}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tooltip components */}
        <Tooltip id="mini-tooltip" className="z-50"/>
        <Tooltip id="mobile-tooltip" className="z-50"/>
        <Tooltip id="preview-tooltip" className="z-50" />
        <Tooltip id="compress-tooltip" className="z-50"/>
      </section>
  );
}