"use client";

import Uploader from "@/components/Uploader";
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function MobileDemoContent() {
  const searchParams = useSearchParams();
  
  // Hide header and other chrome when embedded in iframe
  useEffect(() => {
    const header = document.querySelector('nav, [data-playground-header]') as HTMLElement;
    if (header) {
      header.style.display = 'none';
    }
    
    // Clean up body styling (background will be handled by dark mode effect)
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    return () => {
      if (header) {
        header.style.display = '';
      }
    };
  }, []);
  
  // Parse URL parameters
  const limit = parseInt(searchParams.get('limit') || '99');
  const mini = searchParams.get('mini') === 'true';
  const theme = searchParams.get('theme') || 'blue';
  const enabledAdapters = searchParams.get('enabledAdapters')?.split(',') || ['INTERNAL'];
  const allowPreview = searchParams.get('allowPreview') !== 'false';
  const shouldCompress = searchParams.get('shouldCompress') === 'true';
  const fileSizeLimit = parseInt(searchParams.get('fileSizeLimit') || '999');
  const darkMode = searchParams.get('darkMode') === 'true';

  // Apply dark mode immediately
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.style.background = '#111827'; // dark gray-900
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.background = 'white';
    }
  }, [darkMode]);

  return (
    <div style={{ 
      padding: '16px', 
      width: '100%',
      minHeight: '100vh',
      maxWidth: '400px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: darkMode ? '#111827' : 'white',
      color: darkMode ? '#f9fafb' : '#111827',
      position: 'relative',
      zIndex: 1000
    }}>
      <Uploader
        limit={limit}
        mini={mini}
        theme={theme}
        enabledAdapters={enabledAdapters}
        allowPreview={allowPreview}
        shouldCompress={shouldCompress}
        fileSizeLimit={fileSizeLimit}
      />
    </div>
  );
}

export default function MobileDemoPage() {
  return (
    <>
      {/* Hide navbar with CSS and handle dark mode */}
      <style jsx global>{`
        nav,
        [data-playground-header] {
          display: none !important;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
        }
        /* Dark mode styles will be handled by the component */
      `}</style>
      
      <Suspense fallback={<div style={{padding: '16px', background: 'white'}}>Loading mobile demo...</div>}>
        <MobileDemoContent />
      </Suspense>
    </>
  );
}
