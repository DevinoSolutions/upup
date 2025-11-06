// components/StackBlitzDemoSection.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import sdk from "@stackblitz/sdk";
import Link from "next/link";

export default function StackBlitzDemoSection() {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
    const [pendingFullscreenState, setPendingFullscreenState] = useState(false);

    // lock body scroll while full screen is active
    useEffect(() => {
        if (isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = "";
        };
    }, [isFullscreen]);

    // embed once, on mount and handle fullscreen transitions
    useEffect(() => {
        // Add a small delay to ensure DOM is ready, especially for fullscreen container
        const timeoutId = setTimeout(() => {
            const targetContainer = isFullscreen
                ? document.getElementById('fullscreen-stackblitz-container')
                : containerRef.current;

            if (!targetContainer) {
                console.warn('StackBlitz container not found');
                return;
            }

            // Only embed if container is empty and mounted
            if (targetContainer.children.length === 0) {
                // Start loading when embedding
                setIsLoading(true);
                
                try {
                    sdk.embedProjectId(targetContainer, "stackblitz-starters-flxnhixb", {
                        openFile: "src/App.tsx",
                        view: "default",
                        theme: "dark",
                        hideNavigation: true,
                    }).catch((error) => {
                        console.error('StackBlitz embed failed:', error);
                        setIsLoading(false);
                    });

                    // Fake 8-second loader
                    const timer = setTimeout(() => {
                        setIsLoading(false);
                    }, 8000);

                    return () => clearTimeout(timer);
                } catch (error) {
                    console.error('StackBlitz embed error:', error);
                    setIsLoading(false);
                }
            }
        }, isFullscreen ? 100 : 0); // Delay for fullscreen to ensure DOM is ready

        return () => clearTimeout(timeoutId);
    }, [isFullscreen]);

    const toggleFullScreen = () => {
        const newState = !isFullscreen;
        setPendingFullscreenState(newState);
        setShowFullscreenWarning(true);
    };

    const confirmFullscreenChange = () => {
        setIsFullscreen(pendingFullscreenState);
        setShowFullscreenWarning(false);
    };

    const cancelFullscreenChange = () => {
        setShowFullscreenWarning(false);
        setPendingFullscreenState(isFullscreen);
    };

    return (
        <>
            <section id="live-editor" className="py-24 px-6 relative overflow-hidden">
                <div className="relative max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 mb-8">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            Live Code Editor
                        </div>
                        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                            Try it in your{" "}
                            <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                                browser
                            </span>
                        </h2>
                        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                            Experiment with Upup directly in this interactive playground. Make
                            changes to the code and see results instantly.
                        </p>
                    </div>

                    {/* Regular container when not fullscreen */}
                    {!isFullscreen && (
                        <div className="relative bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-3xl p-2 shadow-2xl">
                            {/* Window bar */}
                            <div className="flex items-center justify-between px-6 py-4 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                        <div className="w-3 h-3 bg-green-500 rounded-full" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        src/App.tsx
                                    </span>
                                </div>

                                <button
                                    onClick={toggleFullScreen}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 dark:bg-primary-dark/10 text-primary dark:text-primary-dark rounded-lg text-sm font-medium hover:bg-primary/20 dark:hover:bg-primary-dark/20 transition-colors"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                    Full&nbsp;screen
                                </button>
                            </div>

                            {/* StackBlitz iframe */}
                            <div className="relative">
                                <div
                                    ref={containerRef}
                                    className="w-full h-[75vh] overflow-hidden rounded-b-2xl"
                                />
                                {/* Loading overlay that covers the StackBlitz container */}
                                {isLoading && !isFullscreen && (
                                    <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-10 rounded-b-2xl">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                            <p className="text-white text-sm">Loading editor...</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* CTA hidden while in full screen */}
                    {!isFullscreen && (
                        <div className="text-center mt-12">
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Like what you see? Get started with Upup in your project today.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link target="_blank" href="/documentation" className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200">
                                    <Code className="w-5 h-5" />
                                    View Documentation
                                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </Link>

                                <a
                                    href="https://github.com/DevinoSolutions/upup"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-8 py-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View on GitHub
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Fullscreen overlay portal */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] bg-gray-900">
                    <div className="w-full h-full flex flex-col">
                        {/* Window bar with improved text readability */}
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                                </div>
                                <span className="text-sm font-medium text-white">
                                    src/App.tsx
                                </span>
                            </div>

                            <button
                                onClick={toggleFullScreen}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <Minimize2 className="w-4 h-4" />
                                Exit&nbsp;full&nbsp;screen
                            </button>
                        </div>

                        {/* StackBlitz iframe container */}
                        <div className="flex-1 overflow-hidden relative">
                            <div className="w-full h-full" id="fullscreen-stackblitz-container" />
                            {/* Loading overlay for fullscreen mode */}
                            {isLoading && isFullscreen && (
                                <div className="absolute inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                        <p className="text-white text-sm">Loading editor...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Minimalist Warning Modal */}
            <AnimatePresence>
                {showFullscreenWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4"
                        onClick={cancelFullscreenChange}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <FaExclamationTriangle className="w-4 h-4 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {pendingFullscreenState ? 'Enter Fullscreen' : 'Exit Fullscreen'}
                                </h3>
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                The editor will reload and any unsaved changes will be lost.
                            </p>
                            
                            <div className="flex gap-3">
                                <button
                                    onClick={cancelFullscreenChange}
                                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg border border-gray-300 dark:border-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmFullscreenChange}
                                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}