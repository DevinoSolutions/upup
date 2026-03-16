// app/layout.tsx
import { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import ThemeProvider from "@/app/theme-provider";
import { Providers } from "@/components/providers";
import PlaygroundHeader from "@/components/PlaygroundHeader";

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
};

export const metadata: Metadata = {
  icons: { icon: "/favicon.ico" },
  title: "Upup Playground",
  description: "Developer playground for testing the Upup uploader component.",
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
        <Script id="extension-handler" strategy="beforeInteractive">
          {`
            (function() {
              const preserveBodyAttributes = () => {
                if (typeof window !== 'undefined' && document.body) {
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
              preserveBodyAttributes();
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', preserveBodyAttributes);
              }
              window.addEventListener('load', preserveBodyAttributes);
            })();
          `}
        </Script>
        <Script id="theme-script" strategy="beforeInteractive">
          {`
            (function() {
              try {
                let themeSet = false;
                function setTheme() {
                  if (themeSet) return;
                  const savedTheme = localStorage.getItem('theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = savedTheme || (prefersDark ? 'dark' : 'light');
                  document.documentElement.className = theme;
                  localStorage.setItem('theme', theme);
                  document.documentElement.setAttribute('data-theme-ready', 'true');
                  themeSet = true;
                }
                setTheme();
                if (document.readyState !== 'loading') {
                  setTheme();
                } else {
                  document.addEventListener('DOMContentLoaded', setTheme);
                }
              } catch (e) {
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
      </head>
      <body
        className={`overflow-x-hidden ${geistSans.variable} ${geistMono.variable} antialiased dark:bg-slate-950`}
        suppressHydrationWarning={true}
        data-hydration-stable="true"
        key="main-body"
      >
        <Providers>
          <ThemeProvider>
            <div className="flex flex-col min-h-screen w-full bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-slate-900">
              <PlaygroundHeader />
              {children}
            </div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
