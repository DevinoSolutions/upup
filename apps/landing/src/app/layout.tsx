// app/layout.tsx
import {Metadata, Viewport} from "next";
import "./globals.css";
import { siteConfig } from "@/lib/siteConfig";
import {Geist, Geist_Mono} from "next/font/google";
import Script from "next/script";
import ThemeProvider from "@/app/theme-provider";
import {Providers} from "@/components/providers";
import SplashCursor from "@/components/SplashCursor";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const viewport: Viewport = {
    themeColor: "#ffffff",
}

export const metadata: Metadata = {
    icons: { icon: "/favicon.ico" },
    title: siteConfig.title,
    description: siteConfig.tagline,
    keywords: [
        "React file uploader",
        "file upload component",
        "Google Drive uploader",
        "S3 upload",
        "OneDrive integration",
        "drag and drop uploader",
        "cloud storage React component",
    ],
    openGraph: {
        title: "Upup – The True Best React File Upload Component",
        description:
            "React file uploader with drag & drop, instant previews, and cloud storage integrations including Google Drive, OneDrive, and S3.",
        images: ["https://useupup.com/img/social-card.png"],
        url: "https://useupup.com/",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Upup – The True Best React File Upload Component",
        description:
            "Open-source React uploader with drag-and-drop, previews, and cloud storage integrations.",
        images: ["https://useupup.com/img/social-card.png"],
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <link rel="icon" href="/favicon.ico" />
            <meta name="theme-color" content="#ffffff" />
            {/* Script to handle browser extension conflicts before hydration */}
            <Script id="extension-handler" strategy="beforeInteractive">
                {`
            (function() {
              // Store original body attributes to prevent hydration mismatches
              const preserveBodyAttributes = () => {
                if (typeof window !== 'undefined' && document.body) {
                  // Remove common browser extension attributes that cause hydration issues
                  const extensionAttributes = [
                    'data-new-gr-c-s-check-loaded',
                    'data-gr-ext-installed',
                    'data-new-gr-c-s-loaded',
                    'data-gr-ext-disabled',
                    'cz-shortcut-listen'
                  ];
                  
                  extensionAttributes.forEach(attr => {
                    if (document.body.hasAttribute(attr)) {
                      document.body.removeAttribute(attr);
                    }
                  });
                }
              };
              
              // Run immediately
              preserveBodyAttributes();
              
              // Run when DOM is ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', preserveBodyAttributes);
              }
              
              // Run just before React hydration
              window.addEventListener('load', preserveBodyAttributes);
            })();
          `}
            </Script>

            {/* Client-side script to handle dark mode and browser extension conflicts */}
            <Script id="theme-script" strategy="beforeInteractive">
                {`
            (function() {
              try {
                // Prevent Grammarly and other extensions from causing hydration issues
                const originalObserver = window.MutationObserver;
                let themeSet = false;
                
                function setTheme() {
                  if (themeSet) return;
                  
                  // Check localStorage for user preference
                  const savedTheme = localStorage.getItem('theme');
                  // Check system preference
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  // Default to system preference if no saved theme
                  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                  
                  // Set the theme class on document element
                  document.documentElement.className = theme;
                  localStorage.setItem('theme', theme);
                  
                  // Mark as hydration ready to prevent conflicts
                  document.documentElement.setAttribute('data-theme-ready', 'true');
                  themeSet = true;
                }
                
                // Set theme immediately
                setTheme();
                
                // Also set it when DOM is ready in case first attempt failed
                if (document.readyState !== 'loading') {
                  setTheme();
                } else {
                  document.addEventListener('DOMContentLoaded', setTheme);
                }
                
              } catch (e) {
                // Fallback to light mode if anything fails
                try {
                  document.documentElement.className = 'light';
                  document.documentElement.setAttribute('data-theme-ready', 'true');
                } catch (fallbackError) {
                  console.warn('Theme setting failed:', fallbackError);
                }
              }
            })();
          `}
            </Script>
            {process.env.NODE_ENV === "production" && (
                <>
                    <Script
                        defer
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                              (function(h,o,t,j,a,r){
                                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                                  h._hjSettings={hjid:6368230,hjsv:6};
                                  a=o.getElementsByTagName('head')[0];
                                  r=o.createElement('script');r.async=1;
                                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                                  a.appendChild(r);
                              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
                            `,
                        }}
                    />
                </>
            )}
        </head>
        <body
            className={`overflow-x-hidden ${geistSans.variable} ${geistMono.variable} antialiased dark:bg-slate-950`}
            suppressHydrationWarning={true}
            data-hydration-stable="true"
            key="main-body"
        >
            <Providers>
                <ThemeProvider>
                    <SplashCursor />
                    <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900">
                        <Navbar />
                        {children}
                    </div>
                </ThemeProvider>
            </Providers>
        </body>
        </html>
    );
}