"use client";

import React, {useCallback, useMemo, useState} from "react";
import Link from "next/link";
import {Copy, Check, Play, Github, ExternalLink, ArrowRight, ChevronDown} from "lucide-react";
import {motion, AnimatePresence} from "framer-motion";
import GradientText from "@/components/TextAnimation/GradientText";
import BlurText from "@/components/TextAnimation/BlurText";

export default function HeroSection() {
    const [copied, setCopied] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedManager, setSelectedManager] = useState("npm");

    const packageManagers = useMemo(() => [
        {id: "npm", name: "npm", command: "npm install upup-react-file-uploader"},
        {id: "pnpm", name: "pnpm", command: "pnpm add upup-react-file-uploader"},
        {id: "yarn", name: "Yarn", command: "yarn add upup-react-file-uploader"},
        {id: "bun", name: "Bun", command: "bun add upup-react-file-uploader"},
    ], []);

    const currentCommand = useMemo(() => {
        return packageManagers.find(pm => pm.id === selectedManager)?.command || packageManagers[0].command;
    }, [selectedManager, packageManagers]);

    const handleSelectManager = useCallback((managerId: any) => {
        setSelectedManager(managerId);
        setIsOpen(false);

        // Auto-copy when selection changes
        const command = packageManagers.find(pm => pm.id === managerId)?.command;
        if (command && typeof window !== "undefined" && navigator.clipboard) {
            navigator.clipboard
                .writeText(command)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => console.warn("Please copy text manually!"));
        }
    }, [packageManagers]);

    const handleCopy = useCallback(() => {
        if (typeof window !== "undefined" && navigator.clipboard) {
            navigator.clipboard
                .writeText(currentCommand)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => console.warn("Please copy text manually!"));
        }
    }, [currentCommand]);

    const easeCurve: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.7,
                ease: easeCurve
            }
        }
    };

    const badgeVariants = {
        hidden: { opacity: 0, y: -20, scale: 0.8 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: easeCurve
            }
        }
    };

    const headingVariants = {
        hidden: { opacity: 0, y: 40 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: easeCurve,
                delay: 0.2
            }
        }
    };

    const subtitleVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.7,
                ease: easeCurve,
                delay: 0.4
            }
        }
    };

    const buttonVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: easeCurve
            }
        }
    };

    const installBoxVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.9 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.7,
                ease: easeCurve,
                delay: 0.8
            }
        }
    };

    return (
        <section className="relative pt-20 pb-12 px-6 rounded-xl mt-28">
            {/* Background Elements */}
         

            <div className="relative max-w-7xl mx-auto">
                <motion.div
                    className="text-center max-w-4xl mx-auto mb-16"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {/* Badge */}
                    <motion.div
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-primary/5 dark:bg-primary-dark/5 backdrop-blur-sm border border-primary/20 dark:border-primary-dark/20 text-sm font-medium text-primary dark:text-primary-dark mb-8 hover:bg-primary/10 dark:hover:bg-primary-dark/10 transition-all duration-200 shadow-sm hover:shadow-md"
                        variants={badgeVariants}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <motion.div
                            className="flex items-center justify-center w-5 h-5 bg-primary/10 dark:bg-primary-dark/10 rounded-full"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            <div className="w-2 h-2 bg-primary dark:bg-primary-dark rounded-full animate-pulse"></div>
                        </motion.div>
                        <span>Open Source & Active</span>
                    </motion.div>

                    {/* Main Heading */}
                    <motion.h1
                        className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight mb-6 leading-[1.1] text-center"
                        variants={headingVariants}
                    >
                        <BlurText
                            text="File Uploads For"
                            delay={150}
                            animateBy="words"
                            direction="top"
                            className="text-gray-900 dark:text-white text-center justify-center"
                        />

                        <span className="relative">
                            <GradientText
                                colors={["#1849d6", "#4079ff", "#37c4f5", "#1849d6", "#40ffaa"]}
                                animationSpeed={10}
                                showBorder={false}
                                className="font-bold"
                            >
                             Modern Web
                            </GradientText>
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed max-w-3xl mx-auto"
                        variants={subtitleVariants}
                    >
                        Open-source full-stack file uploader with{" "}
                        <motion.span
                            className="font-semibold text-gray-900 dark:text-white"
                            initial={{ opacity: 0.7 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.5 }}
                        >
                            cloud integrations
                        </motion.span>
                        ,{" "}
                        drag & drop, and enterprise features.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                        variants={itemVariants}
                        transition={{ delay: 0.6 }}
                    >
                        <motion.div
                            variants={buttonVariants}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Link
                                href="#demo"
                                className="group inline-flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                            >
                                <Play className="w-5 h-5"/>
                                Try Live Demo
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform"/>
                            </Link>
                        </motion.div>

                        <motion.div
                            variants={buttonVariants}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ delay: 0.1 }}
                        >
                            <a
                                href="https://github.com/DevinoSolutions/upup"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-white/80 dark:hover:bg-gray-800/80 transition-all duration-200"
                            >
                                <Github className="w-5 h-5"/>
                                View Source
                                <ExternalLink className="w-4 h-4"/>
                            </a>
                        </motion.div>
                    </motion.div>

                    {/* Install Command with Package Manager Select */}
                    <motion.div
                        className="max-w-lg mx-auto mb-16"
                        variants={installBoxVariants}
                    >
                        <motion.div
                            className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-4 transition-all duration-200"
                            whileHover={{
                                scale: 1.02,
                                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <motion.code
                                    className="text-sm font-mono text-gray-700 dark:text-gray-300 select-all flex-1 mr-4"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1, duration: 0.5 }}
                                >
                                    {currentCommand}
                                </motion.code>

                                <motion.div
                                    className="flex items-center gap-2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 1.1, duration: 0.5 }}
                                >
                                    {/* Copy Button */}
                                    <motion.button
                                        onClick={handleCopy}
                                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        whileHover={{ scale: 1.05, rotate: 5 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <AnimatePresence mode="wait">
                                            {copied ? (
                                                <motion.div
                                                    key="check"
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    exit={{ scale: 0, rotate: 180 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <Check className="w-4 h-4 text-green-600"/>
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="copy"
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    exit={{ scale: 0, rotate: 180 }}
                                                    transition={{ duration: 0.3 }}
                                                >
                                                    <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400"/>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.button>

                                    {/* Package Manager Select */}
                                    <div className="relative">
                                        <motion.button
                                            onClick={() => setIsOpen(!isOpen)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span>{packageManagers.find(pm => pm.id === selectedManager)?.name}</span>
                                            <motion.div
                                                animate={{ rotate: isOpen ? 180 : 0 }}
                                                transition={{ duration: 0.3, ease: easeCurve }}
                                            >
                                                <ChevronDown className="w-4 h-4"/>
                                            </motion.div>
                                        </motion.button>

                                        <AnimatePresence>
                                            {isOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="absolute z-50 top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]"
                                                >
                                                    {packageManagers.map((manager, index) => (
                                                        <motion.button
                                                            key={manager.id}
                                                            onClick={() => handleSelectManager(manager.id)}
                                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                                                selectedManager === manager.id
                                                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                                                                    : 'text-gray-700 dark:text-gray-300'
                                                            }`}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            whileHover={{
                                                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                                                x: 4
                                                            }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            {manager.name}
                                                        </motion.button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
