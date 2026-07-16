// app/layout.tsx
import { Metadata, Viewport } from 'next'
import './globals.css'
import { siteConfig } from '@/lib/siteConfig'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import ThemeProvider from '@/app/theme-provider'
import { Providers } from '@/components/providers'
import { PostHogProvider } from '@/components/posthog-provider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

export const viewport: Viewport = {
    themeColor: '#ffffff',
}

export const metadata: Metadata = {
    metadataBase: new URL('https://useupup.com'),
    title: siteConfig.title,
    description: siteConfig.tagline,
    openGraph: {
        title: 'upup – One File Uploader for Every Framework',
        description:
            'One open-source file uploader with a headless core and native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact. Cloud drives, camera, screen capture, and secure server-mode uploads to any S3-compatible storage. MIT-licensed.',
        images: ['https://useupup.com/img/social-card.png'],
        url: 'https://useupup.com/',
        type: 'website',
        siteName: 'upup',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'upup – One File Uploader for Every Framework',
        description:
            'One uploader, native UI for React, Vue, Svelte, Angular, Vanilla JS & Preact. Headless core, cloud drives, and secure server-mode uploads to any S3-compatible storage. Open-source, MIT.',
        images: ['https://useupup.com/img/social-card.png'],
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
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
                {process.env.NODE_ENV === 'production' && (
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
                className={`overflow-x-hidden ${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--bg-base)]`}
                suppressHydrationWarning={true}
                data-hydration-stable="true"
                key="main-body"
            >
                <PostHogProvider>
                    <Providers>
                        <ThemeProvider>
                            <div className="flex flex-col min-h-screen w-full bg-[var(--bg-base)]">
                                <Navbar />
                                {children}
                                <Footer />
                            </div>
                        </ThemeProvider>
                    </Providers>
                </PostHogProvider>
            </body>
        </html>
    )
}
