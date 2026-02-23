"use client";

import React, {useContext} from "react";
import { ToastContainer } from "react-toastify";
import {ThemeContext} from "@/lib/contexts";

export default function Toast() {

  const { isDarkMode } = useContext(ThemeContext);
  return (
    <ToastContainer
      limit={3}
      theme={isDarkMode ? 'dark' : 'light'}
      position="top-right"
      progressClassName="h-0"
      hideProgressBar
      newestOnTop
    />
  );
}
