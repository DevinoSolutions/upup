"use client";

import { useContext } from "react";
import { ThemeContext } from "@/lib/contexts";
import { MdDarkMode, MdOutlineLightMode } from "react-icons/md";

export default function PlaygroundHeader() {
  const { isDarkMode, switchTheme } = useContext(ThemeContext);

  return (
    <nav
      className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm"
      data-playground-header
    >
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Upup Playground
      </h1>
      <button
        type="button"
        onClick={switchTheme}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDarkMode ? (
          <MdOutlineLightMode className="w-5 h-5 text-gray-100" />
        ) : (
          <MdDarkMode className="w-5 h-5 text-gray-700" />
        )}
      </button>
    </nav>
  );
}
