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
    // Media-conditional so the browser chrome follows the page's own theme
    // instead of pinning white behind a dark page.
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#ffffff' },
        { media: '(prefers-color-scheme: dark)', color: '#05070d' },
    ],
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

                {/* Pre-hydration theme paint.
                    MUST STAY IN SYNC with src/lib/theme.ts — this is the same
                    resolve + apply logic, inlined because a beforeInteractive
                    script cannot import a module. Any change to resolveTheme /
                    applyTheme belongs here too. Note the classList add/remove:
                    assigning documentElement.className would clobber every
                    other class on <html>. */}
                <Script id="theme-script" strategy="beforeInteractive">
                    {`
            (function() {
              var themeSet = false;

              function setTheme() {
                if (themeSet) return;

                // resolveTheme(): stored preference, else the OS preference,
                // else light.
                var theme = 'light';
                try {
                  var saved = localStorage.getItem('theme');
                  if (saved === 'dark' || saved === 'light') theme = saved;
                  else theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                } catch (e) {
                  try {
                    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } catch (e2) {
                    theme = 'light';
                  }
                }

                // applyTheme(theme)
                var root = document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(theme);
                try {
                  localStorage.setItem('theme', theme);
                } catch (e) {
                  // Persistence is best-effort.
                }

                // Mark as hydration ready to prevent conflicts
                root.setAttribute('data-theme-ready', 'true');
                themeSet = true;
              }

              setTheme();

              // Also set it when DOM is ready in case the first attempt failed
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setTheme);
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
