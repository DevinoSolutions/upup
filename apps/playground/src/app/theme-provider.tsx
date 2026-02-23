"use client";

import { ThemeContext } from "@/lib/contexts";
import {ReactNode, useEffect, useState} from "react";

export default function ThemeProvider({
                                          children,
                                      }: {
    children: ReactNode;
}) {
    const [isDarkMode, setDarkMode] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    const switchTheme = () => {
        setDarkMode((prev) => {
            const next = !prev;
            localStorage.setItem("theme", next ? "dark" : "light");
            document.documentElement.className = next ? "dark" : "light";
            return next;
        });
    };

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = saved ? saved === "dark" : prefersDark;
        setDarkMode(initial);
        document.documentElement.className = initial ? "dark" : "light";
    }, []);

    // Prevent hydration mismatch by not rendering until mounted
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ isDarkMode, switchTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
