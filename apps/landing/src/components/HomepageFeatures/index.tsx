'use client'

import { useState, useRef } from 'react'
import * as gtag from '@/lib/gtag'
import FeatureShowcase from '@/components/FeatureShowcase'
import Section from '@/components/ui/Section'
import SectionHeading, {
    GRADIENT_TEXT,
    H3_HEADING,
} from '@/components/ui/SectionHeading'
import { FaStar } from 'react-icons/fa'
import EmailModal from './EmailModal'
import PlannedStrip from './PlannedStrip'
import SupportedWall from './SupportedWall'
import { fileTypes } from './fileTypes'
import { developerStorageProviders, userStorageProviders } from './providers'
import type { Integration } from './types'

export default function HomepageFeatures() {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(
        null,
    )
    const [modalOpen, setModalOpen] = useState(false)
    const [isCustomRequest, setIsCustomRequest] = useState(false)
    const triggerRef = useRef<HTMLElement | null>(null)

    const userSupported = userStorageProviders.filter(
        p => p.status !== 'planned',
    )
    const userPlanned = userStorageProviders.filter(p => p.status === 'planned')
    const devSupported = developerStorageProviders.filter(
        p => p.status !== 'planned',
    )
    const devPlanned = developerStorageProviders.filter(
        p => p.status === 'planned',
    )

    const handleProviderClick = (
        provider: Integration,
        trigger: HTMLElement,
    ) => {
        if (provider.status === 'supported') return // Don't show modal for supported providers

        // Track the interest in analytics. Status rides the label, not `value`
        // — GA4's `value` is the numeric parameter.
        gtag.event({
            action: 'provider_interest',
            event_category: 'providers',
            event_label: `${provider.name} (${provider.status})`,
        })

        triggerRef.current = trigger
        setSelectedProvider(provider.name)
        setIsCustomRequest(false)
        setModalOpen(true)
    }

    const handleCustomRequest = (trigger: HTMLElement) => {
        gtag.event({
            action: 'request_provider',
            event_category: 'providers',
            event_label: 'custom_request',
        })
        triggerRef.current = trigger
        setSelectedProvider('Custom Provider')
        setIsCustomRequest(true)
        setModalOpen(true)
    }

    return (
        <Section id="features">
            {/* Marquee keyframes for the file-type strip. The loop only exists
                under no-preference (the motion-safe equivalent): reduced motion
                renders the row static, never a started-then-stopped animation. */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0) }
                    100% { transform: translateX(-50%) }
                }
                @media (prefers-reduced-motion: no-preference) {
                    .animate-marquee {
                        animation: marquee 25s linear infinite;
                    }
                    .animate-marquee:hover {
                        animation-play-state: paused;
                    }
                }
            `}</style>

            {/* Section Header */}
            <SectionHeading
                badge={
                    <>
                        <FaStar className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                        Powerful Features
                    </>
                }
                title={
                    <>
                        Everything you need for{' '}
                        <span className={`block ${GRADIENT_TEXT}`}>
                            modern file uploads
                        </span>
                    </>
                }
                subtitle="One uploader with a headless core and native UI for React, Vue, Svelte, Angular, Vanilla JS, and Preact — with a drag-and-drop dropzone, file picker, cloud-drive sources, camera and screen capture, and optional server-mode uploads to any S3-compatible storage."
            />

            {/* Main Features — animated showcase rows */}
            <FeatureShowcase />

            {/* Cloud Providers Section */}
            <div className="mb-16">
                {/* User Storage Providers */}
                <div className="mb-20">
                    <div className="text-center mb-12">
                        <h3 className={`${H3_HEADING} mb-4`}>
                            Let your users connect to their{' '}
                            <span className={GRADIENT_TEXT}>
                                favorite storage cloud providers
                            </span>
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Users can directly upload from these providers in
                            upup
                        </p>
                    </div>

                    <SupportedWall providers={userSupported} />

                    <PlannedStrip
                        planned={userPlanned}
                        onProviderClick={handleProviderClick}
                        onCustomRequest={handleCustomRequest}
                    />
                </div>

                {/* Developer Storage Providers */}
                <div>
                    <div className="text-center mb-12">
                        <h3 className={`${H3_HEADING} mb-4`}>
                            And for developers, connect upup to your{' '}
                            <span className={GRADIENT_TEXT}>
                                favorite cloud bucket
                            </span>
                        </h3>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            You can connect to upup using any S3 provider. We
                            also support Azure Blob Storage in client mode.
                        </p>
                    </div>

                    <SupportedWall providers={devSupported} />

                    <PlannedStrip
                        planned={devPlanned}
                        onProviderClick={handleProviderClick}
                        onCustomRequest={handleCustomRequest}
                    />
                </div>
            </div>

            {/* File Types with Modern Infinite Marquee */}
            <div>
                <div className="text-center mb-10">
                    <h3 className={`${H3_HEADING} mb-4`}>
                        Support for{' '}
                        <span className={GRADIENT_TEXT}>all file types</span>
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Upload images, videos, documents, and large files —
                        handle any file type and size limit your users need
                    </p>
                </div>

                {/* Modern Infinite Marquee with Scroll-triggered Animation.
                        Fixed-width edge-fade mask on both sides paired with matching
                        horizontal padding: the fade zones sit over the padding gutters,
                        so at rest (and under prefers-reduced-motion, which freezes the
                        row at translateX(0)) the first card clears the left fade instead
                        of rendering half-faded, while cards still vanish smoothly at both
                        edges while animating. Padding lives on the container, not the
                        animated row, so the -50% seamless loop is unaffected. */}
                <div
                    className="relative overflow-hidden px-10 py-6"
                    style={{
                        maskImage:
                            'linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent)',
                        WebkitMaskImage:
                            'linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent)',
                    }}
                >
                    <div className="flex animate-marquee">
                        {/* Two identical sets for a seamless -50% loop */}
                        {[...fileTypes, ...fileTypes].map((type, index) => (
                            <div
                                key={index}
                                className="relative flex-shrink-0 text-center p-8 mx-4 min-w-[200px] rounded-3xl border border-black/5 bg-[var(--bg-base)] dark:border-white/10"
                            >
                                <div className="flex justify-center mb-6 text-gray-500 dark:text-gray-400">
                                    {type.icon}
                                </div>
                                <div className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                                    {type.label}
                                </div>
                                <div className="text-gray-600 dark:text-gray-400 text-sm">
                                    {type.types}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <EmailModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                integrationName={selectedProvider || ''}
                isCustom={isCustomRequest}
                triggerRef={triggerRef}
            />
        </Section>
    )
}
