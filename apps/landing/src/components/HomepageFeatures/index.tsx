'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { m, AnimatePresence } from 'framer-motion'
import {
    FaFileAlt,
    FaStar,
    FaTimes,
    FaSpinner,
    FaPlus,
    FaInstagram,
    FaFacebook,
    FaApple,
    FaPinterest,
    FaTiktok,
    FaGoogle,
    FaPhotoVideo,
    FaImage,
    FaVideo,
    FaMusic,
} from 'react-icons/fa'
import {
    SiAmazonwebservices,
    SiDigitalocean,
    SiBackblaze,
    SiBox,
    SiGoogledrive,
    SiJavascript,
    SiCloudflare,
    SiVercel,
    SiSupabase,
    SiDropbox,
    SiZoom,
    SiMinio,
    SiAlibabadotcom,
    SiHetzner,
    SiScaleway,
    SiWasabi,
    SiOracle,
} from 'react-icons/si'
import { GrOnedrive } from 'react-icons/gr'
import { VscAzure } from 'react-icons/vsc'
import { ImFileZip } from 'react-icons/im'
import { IbmLogo, IDriveLogo, LinodeLogo } from './ProviderLogos'
import * as gtag from '@/lib/gtag'
import { submitAndRecordProviderInterest } from './notify-signup'
import FeatureShowcase from '@/components/FeatureShowcase'
import Section from '@/components/ui/Section'
import SectionHeading, {
    GRADIENT_TEXT,
    H3_HEADING,
} from '@/components/ui/SectionHeading'

interface Integration {
    id: string
    name: string
    icon: React.ComponentType<{
        className?: string
        style?: React.CSSProperties
    }>
    status: 'supported' | 'in-development' | 'planned'
    description: string
    category: string
    /** Docs page for this provider. When set, the supported chip links to it. */
    href?: string
    /** Short caveat shown under the chip name (e.g. a mode restriction). */
    qualifier?: string
}

interface EmailModalProps {
    isOpen: boolean
    onClose: () => void
    integrationName: string
    isCustom?: boolean
    /** Element that opened the dialog; focus returns here on close. */
    triggerRef?: React.RefObject<HTMLElement | null>
}

// User Storage Providers - for end users to connect their personal cloud storage
const userStorageProviders: Integration[] = [
    {
        id: 'google-drive',
        name: 'Google Drive',
        icon: SiGoogledrive,
        status: 'supported',
        description: 'Direct access to files',
        category: 'User Storage',
    },
    {
        id: 'one-drive',
        name: 'OneDrive',
        icon: GrOnedrive,
        status: 'supported',
        description: 'Microsoft cloud storage',
        category: 'User Storage',
    },
    {
        id: 'dropbox',
        name: 'Dropbox',
        icon: SiDropbox,
        status: 'supported',
        description: 'Cloud file sharing',
        category: 'User Storage',
    },
    {
        id: 'box',
        name: 'Box',
        icon: SiBox,
        status: 'supported',
        description: 'Secure content management',
        category: 'User Storage',
    },
    {
        id: 'instagram',
        name: 'Instagram',
        icon: FaInstagram,
        status: 'planned',
        description: 'Import photos and videos',
        category: 'User Storage',
    },
    {
        id: 'facebook',
        name: 'Facebook',
        icon: FaFacebook,
        status: 'planned',
        description: 'Access photos and videos',
        category: 'User Storage',
    },
    {
        id: 'zoom',
        name: 'Zoom',
        icon: SiZoom,
        status: 'planned',
        description: 'Upload recordings',
        category: 'User Storage',
    },
    {
        id: 'google-photos',
        name: 'Google Photos Picker',
        icon: FaPhotoVideo,
        status: 'planned',
        description: 'Photos picker integration',
        category: 'User Storage',
    },
    {
        id: 'icloud',
        name: 'iCloud Drive',
        icon: FaApple,
        status: 'planned',
        description: 'Apple cloud storage',
        category: 'User Storage',
    },
    {
        id: 'pinterest',
        name: 'Pinterest',
        icon: FaPinterest,
        status: 'planned',
        description: 'Import images',
        category: 'User Storage',
    },
    {
        id: 'tiktok',
        name: 'TikTok',
        icon: FaTiktok,
        status: 'planned',
        description: 'Upload videos',
        category: 'User Storage',
    },
]

// Developer Storage Providers - for developers to connect their cloud buckets.
//
// The `supported` entries mirror the StorageProvider enum in @useupup/core
// (packages/core/src/types/storage-provider.ts) — CHECK THE ENUM before
// marking anything supported here. This list is a curated subset, not the
// whole enum: the long tail (Vultr, UpCloud, OVHcloud, Contabo, Storj, Ceph)
// is deliberately omitted to keep the wall readable, so absence from this
// list does NOT mean absence from the enum. The durable fix is deriving the
// supported set from the enum instead of restating it; until then a provider
// added to the enum has to be added here by hand.
const developerStorageProviders: Integration[] = [
    {
        id: 'aws',
        name: 'AWS S3',
        icon: SiAmazonwebservices,
        status: 'supported',
        description: 'Amazon S3 buckets',
        category: 'Developer Storage',
    },
    {
        id: 'azure',
        name: 'Azure Blob',
        icon: VscAzure,
        status: 'supported',
        description: 'Microsoft Azure storage',
        category: 'Developer Storage',
        href: '/docs/guides/storage/azure-blob/',
        // Azure is the sole member of NON_S3_STORAGE_PROVIDERS in
        // @useupup/core: it has no S3 surface, so createUpupHandler throws
        // for it at construct time and server mode cannot serve it.
        qualifier: 'client mode only',
    },
    {
        id: 'backblaze',
        name: 'Backblaze B2',
        icon: SiBackblaze,
        status: 'supported',
        description: 'Cost-effective storage',
        category: 'Developer Storage',
    },
    {
        id: 'digitalocean',
        name: 'DigitalOcean',
        icon: SiDigitalocean,
        status: 'supported',
        description: 'Spaces object storage',
        category: 'Developer Storage',
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare R2',
        icon: SiCloudflare,
        status: 'supported',
        description: 'R2 object storage',
        category: 'Developer Storage',
    },
    {
        id: 'wasabi',
        name: 'Wasabi Hot Cloud Storage',
        icon: SiWasabi,
        status: 'supported',
        description: 'Hot cloud storage',
        category: 'Developer Storage',
    },
    {
        id: 'linode',
        name: 'Linode Object Storage',
        icon: LinodeLogo,
        status: 'supported',
        description: 'Linode object storage',
        category: 'Developer Storage',
    },
    {
        id: 'idrive',
        name: 'IDrive e2',
        icon: IDriveLogo,
        status: 'supported',
        description: 'IDrive object storage',
        category: 'Developer Storage',
    },
    {
        id: 'hetzner',
        name: 'Hetzner Object Storage',
        icon: SiHetzner,
        status: 'supported',
        description: 'Hetzner cloud storage',
        category: 'Developer Storage',
    },
    {
        id: 'scaleway',
        name: 'Scaleway Object Storage',
        icon: SiScaleway,
        status: 'supported',
        description: 'Scaleway cloud storage',
        category: 'Developer Storage',
    },
    {
        id: 'oracle',
        name: 'Oracle Cloud Object Storage',
        icon: SiOracle,
        status: 'supported',
        description: 'Oracle cloud storage',
        category: 'Developer Storage',
    },
    {
        id: 'alibaba',
        name: 'Alibaba Cloud OSS',
        icon: SiAlibabadotcom,
        status: 'supported',
        description: 'Alibaba Cloud OSS',
        category: 'Developer Storage',
    },
    {
        id: 'minio',
        name: 'MinIO',
        icon: SiMinio,
        status: 'supported',
        description: 'Self-hosted storage',
        category: 'Developer Storage',
    },
    {
        id: 'gcp',
        name: 'Google Cloud Storage',
        icon: FaGoogle,
        status: 'supported',
        description: 'Google Cloud storage',
        category: 'Developer Storage',
    },
    {
        id: 'supabase',
        name: 'Supabase',
        icon: SiSupabase,
        status: 'supported',
        description: 'Supabase storage',
        category: 'Developer Storage',
    },
    {
        id: 'vercel',
        name: 'Vercel Blob',
        icon: SiVercel,
        status: 'planned',
        description: 'Vercel blob storage',
        category: 'Developer Storage',
    },
    {
        id: 'ibm',
        name: 'IBM Cloud Object Storage',
        icon: IbmLogo,
        status: 'planned',
        description: 'IBM cloud storage',
        category: 'Developer Storage',
    },
]

const fileTypes = [
    {
        icon: <FaImage className="w-8 h-8" />,
        label: 'Images',
        types: 'JPG, PNG, GIF, WebP',
    },
    {
        icon: <FaFileAlt className="w-8 h-8" />,
        label: 'Documents',
        types: 'PDF, DOC, DOCX, TXT',
    },
    {
        icon: <FaVideo className="w-8 h-8" />,
        label: 'Videos',
        types: 'MP4, AVI, MOV, WebM',
    },
    {
        icon: <FaMusic className="w-8 h-8" />,
        label: 'Audio',
        types: 'MP3, WAV, OGG, FLAC',
    },
    {
        icon: <ImFileZip className="w-8 h-8" />,
        label: 'Archives',
        types: 'ZIP, RAR, 7Z, TAR',
    },
    {
        icon: <SiJavascript className="w-8 h-8" aria-hidden />,
        label: 'Code',
        types: 'JS, TS, JSON, XML',
    },
]

// Tab stops inside the dialog. The honeypot carries tabIndex -1, so it is
// never part of the cycle.
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

const EmailModal: React.FC<EmailModalProps> = ({
    isOpen,
    onClose,
    integrationName,
    isCustom = false,
    triggerRef,
}) => {
    const [email, setEmail] = useState('')
    const [customToolName, setCustomToolName] = useState('')
    const [website, setWebsite] = useState('') // honeypot
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [failed, setFailed] = useState(false)
    // One id per submission lifecycle so a retry is idempotent server-side;
    // regenerated only after a confirmed success (same rule as SupportForm).
    const feedbackIdRef = useRef<string>('')
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dialogRef = useRef<HTMLDivElement>(null)
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose
    // Bumped on every close. A submit captures it before awaiting; if it has
    // moved by the time the request settles, the dialog that started the
    // submit is gone (closed, possibly reopened) and the result must not
    // touch the UI. The request itself is never aborted: the sign-up is real.
    const closeGenRef = useRef(0)
    const isOpenRef = useRef(isOpen)
    isOpenRef.current = isOpen
    const headingId = React.useId()

    useEffect(
        () => () => {
            if (closeTimer.current) clearTimeout(closeTimer.current)
        },
        [],
    )

    const resetAfterSuccess = useCallback(() => {
        setEmail('')
        setCustomToolName('')
        setWebsite('')
        setIsSubmitted(false)
    }, [])

    // Modal behaviour while open: focus the first field (after mount, so it
    // holds under reduced motion too), keep Tab inside, close on Escape, and
    // hand focus back to whatever opened the dialog.
    useEffect(() => {
        if (!isOpen) return
        // Not every browser focuses a button on click (Safari, Firefox on
        // macOS), so prefer the element the click handler recorded.
        const trigger =
            triggerRef?.current ??
            (document.activeElement as HTMLElement | null)
        const dialog = dialogRef.current
        dialog?.querySelector<HTMLElement>('input:not([aria-hidden])')?.focus()

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (e.defaultPrevented) return
                // Consume the key so a layer underneath (the navbar's mobile
                // menu) stays open.
                e.preventDefault()
                onCloseRef.current()
                return
            }
            if (e.key !== 'Tab' || !dialog) return
            const stops = [
                ...dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
            ].filter(
                el =>
                    el.tabIndex >= 0 &&
                    !(el as HTMLButtonElement | HTMLInputElement).disabled,
            )
            const first = stops[0]
            const last = stops[stops.length - 1]
            const active = document.activeElement
            if (!first) {
                e.preventDefault()
                dialog.focus()
            } else if (
                !dialog.contains(active) ||
                !stops.includes(active as HTMLElement)
            ) {
                // Outside the dialog, or on a control that is not a stop (the
                // submit button while it is disabled mid-submit, the honeypot).
                e.preventDefault()
                ;(e.shiftKey ? last : first).focus()
            } else if (e.shiftKey && active === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && active === last) {
                e.preventDefault()
                first.focus()
            }
        }
        // Capture phase: a bubble listener registered earlier (the navbar's
        // mobile-menu Escape) would otherwise run first and close both layers.
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
            document.removeEventListener('keydown', onKeyDown, true)
            closeGenRef.current += 1
            // Detach from any in-flight submit so a reopen starts enabled.
            setIsSubmitting(false)
            // A pending success timer must not outlive the dialog it belongs
            // to; apply its reset now so a reopen starts from the form.
            if (closeTimer.current) {
                clearTimeout(closeTimer.current)
                closeTimer.current = null
                resetAfterSuccess()
            }
            trigger?.focus()
        }
    }, [isOpen, triggerRef, resetAfterSuccess])

    const providerName = isCustom ? customToolName : integrationName

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || (isCustom && !customToolName) || isSubmitting) return

        setIsSubmitting(true)
        setFailed(false)
        if (!feedbackIdRef.current) feedbackIdRef.current = crypto.randomUUID()

        // Google Analytics records WHICH provider was asked for, never who
        // asked. PostHog (after a confirmed sign-up) gets the submission id as
        // the person id; no email or derivative of one ever reaches it.
        gtag.event({
            action: 'provider_email_submit',
            event_category: 'providers',
            event_label: isCustom ? `Custom: ${customToolName}` : providerName,
        })

        // Calls the route, then records the sign-up and its source (UTM, referrer,
        // landing page) in the browser only on a confirmed server success.
        const closeGen = closeGenRef.current
        const ok = await submitAndRecordProviderInterest({
            email,
            providerName,
            isCustom,
            feedbackId: feedbackIdRef.current,
            website,
        })

        if (closeGen !== closeGenRef.current) {
            // Settled after the dialog was dismissed: no success panel, no
            // close timer, no failure UI. A recorded sign-up still leaves the
            // next open fresh (unless it is already open on new input).
            if (ok) {
                feedbackIdRef.current = ''
                if (!isOpenRef.current) resetAfterSuccess()
            }
            return
        }
        setIsSubmitting(false)

        if (!ok) {
            // Keep every field and the same feedbackId so Retry is idempotent.
            setFailed(true)
            return
        }

        setIsSubmitted(true)
        feedbackIdRef.current = ''
        closeTimer.current = setTimeout(() => {
            closeTimer.current = null
            onClose()
            resetAfterSuccess()
        }, 2000)
    }

    return (
        <AnimatePresence>
            {isOpen ? (
                <m.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <m.div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={headingId}
                        tabIndex={-1}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-black/5 dark:border-white/10 focus:outline-none"
                        onClick={e => e.stopPropagation()}
                    >
                        {!isSubmitted ? (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <h3
                                        id={headingId}
                                        className="text-xl font-bold text-gray-900 dark:text-white"
                                    >
                                        {isCustom
                                            ? 'Request Custom Provider'
                                            : `Get notified for ${integrationName}`}
                                    </h3>
                                    <button
                                        type="button"
                                        aria-label="Close"
                                        onClick={onClose}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <FaTimes className="w-4 h-4 text-gray-500" />
                                    </button>
                                </div>

                                <p className="text-gray-600 dark:text-gray-400 mb-6">
                                    {isCustom
                                        ? "Tell us which storage provider you'd like us to integrate with upup and we'll notify you when it's ready."
                                        : `We'll send you an email as soon as the ${integrationName} integration is ready for beta testing.`}
                                </p>

                                <form onSubmit={handleSubmit}>
                                    {isCustom && (
                                        <input
                                            type="text"
                                            value={customToolName}
                                            onChange={e =>
                                                setCustomToolName(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Provider name (e.g., MinIO, Wasabi, IBM Cloud)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-fast mb-4"
                                            required
                                        />
                                    )}

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors duration-fast mb-4"
                                        required
                                    />

                                    {/* Honeypot: hidden from users + assistive tech;
                                    bots that fill it are silently dropped by the
                                    API. Same field name the support form uses. */}
                                    <input
                                        type="text"
                                        name="website"
                                        value={website}
                                        onChange={e =>
                                            setWebsite(e.target.value)
                                        }
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
                                    />

                                    {failed && (
                                        <p
                                            role="alert"
                                            className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-400"
                                        >
                                            Something went wrong recording that.
                                            Your details are still here — try
                                            again.
                                        </p>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-xl border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-3 bg-primary hover:opacity-90 text-white font-semibold rounded-xl transition-opacity duration-fast disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <FaSpinner className="w-4 h-4 animate-spin" />
                                                    {isCustom
                                                        ? 'Requesting...'
                                                        : 'Subscribing...'}
                                                </>
                                            ) : isCustom ? (
                                                'Request Provider'
                                            ) : (
                                                'Notify me'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <m.div
                                role="status"
                                className="text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                        <m.svg
                                            className="w-4 h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 0.25 }}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </m.svg>
                                    </div>
                                </div>
                                <h3
                                    id={headingId}
                                    className="text-xl font-bold text-gray-900 dark:text-white mb-2"
                                >
                                    You&apos;re all set!
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {`We’ll email you when ${providerName} integration is ready.`}
                                </p>
                            </m.div>
                        )}
                    </m.div>
                </m.div>
            ) : null}
        </AnimatePresence>
    )
}

/* Dense, calm logo wall — compact icon+name tiles on the raised surface with
   ONE shared "supported" affordance (a single caption, not a badge per card).
   Replaces the two 12/13-identical-card grids the audit flagged. */
const SupportedWall: React.FC<{ providers: Integration[] }> = ({
    providers,
}) => {
    const captionId = React.useId()
    return (
        <div className="mx-auto max-w-4xl">
            <p
                id={captionId}
                className="mb-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400"
            >
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Supported today
            </p>
            <div
                role="list"
                aria-labelledby={captionId}
                className="flex flex-wrap justify-center gap-3"
            >
                {providers.map(provider => {
                    const card = (
                        <>
                            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/5 bg-black/[0.03] text-gray-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-gray-400">
                                <provider.icon
                                    className="h-5 w-5"
                                    aria-hidden
                                />
                            </span>
                            <span className="text-xs font-medium leading-tight text-gray-900 dark:text-white">
                                {provider.name}
                            </span>
                            {provider.qualifier ? (
                                <span className="text-[10px] leading-tight text-gray-500 max-lg:text-xs dark:text-gray-400">
                                    {provider.qualifier}
                                </span>
                            ) : null}
                        </>
                    )
                    const cardClass =
                        'flex h-full flex-col items-center gap-2.5 rounded-xl border border-black/5 bg-[var(--bg-base)] px-3 py-4 text-center dark:border-white/10'
                    return (
                        <div
                            key={provider.id}
                            role="listitem"
                            className="w-[120px]"
                        >
                            {provider.href ? (
                                <Link
                                    href={provider.href}
                                    className={`${cardClass} transition-colors hover:border-black/10 dark:hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                                >
                                    {card}
                                </Link>
                            ) : (
                                <div className={cardClass}>{card}</div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

interface PlannedStripProps {
    planned: Integration[]
    onProviderClick: (provider: Integration, trigger: HTMLElement) => void
    onCustomRequest: (trigger: HTMLElement) => void
}

const PlannedStrip: React.FC<PlannedStripProps> = ({
    planned,
    onProviderClick,
    onCustomRequest,
}) => (
    <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            On the roadmap — click to request one
        </p>
        <div className="flex flex-wrap justify-center gap-2">
            {planned.map(provider => (
                <button
                    key={provider.id}
                    type="button"
                    onClick={e => onProviderClick(provider, e.currentTarget)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-black/10 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <provider.icon className="w-3.5 h-3.5" aria-hidden />
                    {provider.name}
                </button>
            ))}
            <button
                type="button"
                onClick={e => onCustomRequest(e.currentTarget)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-black/10 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <FaPlus className="w-3.5 h-3.5" />
                Request Custom
            </button>
        </div>
    </div>
)

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
