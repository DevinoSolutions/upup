"use client";

import { useState, useContext, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Github } from "lucide-react";
import { ThemeContext } from "@/lib/contexts";
import ThemeToggler from "@/components/ThemeToggler";

export default function Navbar() {
    const [navbarOpen, setNavbarOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { isDarkMode } = useContext(ThemeContext);

    useEffect(() => {
        setMounted(true);
    }, []);

    const navLinks = (
        <>
            <li>
                <Link
                    href="/documentation"
                    className="block px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors duration-200 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    onClick={() => setNavbarOpen(false)}
                >
                    Docs
                </Link>
            </li>
            <li>
                <Link
                    href="/#demo"
                    className="block px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors duration-200 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    onClick={() => setNavbarOpen(false)}
                >
                    Demo
                </Link>
            </li>
            <li>
                <Link
                    href="/#features"
                    className="block px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors duration-200 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    onClick={() => setNavbarOpen(false)}
                >
                    Features
                </Link>
            </li>
            <li>
                <Link
                    href="/#live-editor"
                    className="block px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors duration-200 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    onClick={() => setNavbarOpen(false)}
                >
                    Live Code Editor
                </Link>
            </li>
            <li>
                <Link
                    target="_blank"
                    href="https://github.com/DevinoSolutions/upup"
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors duration-200 rounded-xl hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
                    onClick={() => setNavbarOpen(false)}
                >
                    <Github className="w-4 h-4" />
                    GitHub
                </Link>
            </li>
        </>
    );

    return (
        <nav className="fixed top-0 w-full z-50  backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-800/50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center justify-between h-24  ">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/">
                            {mounted ? (
                                isDarkMode ? (
                                    <Image src="/img/logo-dark.png" alt="Upup" width={120} height={120} />
                                ) : (
                                    <Image src="/img/logo.png" alt="Upup" width={120} height={120} />
                                )
                            ) : (
                                // Default logo during hydration to prevent mismatch
                                <Image src="/img/logo.png" alt="Upup" width={120} height={120} />
                            )}
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-1">
                        <ul className="flex items-center space-x-1">
                            {navLinks}
                        </ul>
                    </div>

                    {/* Right Side Controls */}
                    <div className="flex items-center space-x-3">
                        {/* CTA Button - Desktop Only */}
                        <Link
                            href="/#demo"
                            className="hidden lg:flex items-center px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                        >
                            Get Started
                        </Link>

                        {/* Theme Toggle */}
                        {mounted && <ThemeToggler isDarkMode={isDarkMode} />}

                        {/* Mobile Menu Button */}
                        <button
                            aria-label="Toggle navigation"
                            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                            onClick={() => setNavbarOpen(!navbarOpen)}
                        >
                            {navbarOpen ? (
                                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            ) : (
                                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            {navbarOpen && (
                <div className="lg:hidden bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-t border-gray-200/20 dark:border-gray-800/50">
                    <div className="px-6 py-6 space-y-4">
                        <ul className="space-y-4">
                            {navLinks}
                        </ul>

                        {/* Mobile CTA */}
                        <div className="pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
                            <Link
                                href="/#demo"
                                className="flex items-center justify-center w-full px-4 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
                                onClick={() => setNavbarOpen(false)}
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}