'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
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
    FaServer,
    FaDatabase,
    FaCube,
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
import * as gtag from '@/lib/gtag'
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
}

/**
 * Record provider interest through the SAME sink the support page uses: the
 * validated /api/upup-support route, which captures an analytics event and
 * emails the request. This modal has no free-text field, so it composes the
 * message itself and sends the visitor's address as the reply-to.
 *
 * The address is NEVER passed to Google Analytics — the gtag event carries only
 * the provider name. `website` is the honeypot the route reads to drop bots.
 */
async function submitProviderInterest(input: {
    email: string
    providerName: string
    isCustom: boolean
    feedbackId: string
    website: string
}): Promise<boolean> {
    const message = input.isCustom
        ? `Custom storage provider requested from the homepage: ${input.providerName}.`
        : `Notify-me request from the homepage for the ${input.providerName} integration.`
    try {
        // next.config sets trailingSlash:true, so the bare path would 308 the
        // POST — hit the canonical URL (same rule as SupportForm).
        const res = await fetch('/api/upup-support/', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                type: 'provider_notify',
                message,
                wantsReply: true,
                email: input.email,
                feedbackId: input.feedbackId,
                route:
                    typeof window !== 'undefined'
                        ? window.location.pathname
                        : undefined,
                website: input.website,
            }),
        })
        const body = (await res.json().catch(() => null)) as {
            ok?: boolean
        } | null
        return res.ok && body?.ok === true
    } catch {
        return false
    }
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
        icon: FaServer,
        status: 'supported',
        description: 'Linode object storage',
        category: 'Developer Storage',
    },
    {
        id: 'idrive',
        name: 'IDrive e2',
        icon: FaDatabase,
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
        icon: FaCube,
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

const EmailModal: React.FC<EmailModalProps> = ({
    isOpen,
    onClose,
    integrationName,
    isCustom = false,
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

    useEffect(
        () => () => {
            if (closeTimer.current) clearTimeout(closeTimer.current)
        },
        [],
    )

    const providerName = isCustom ? customToolName : integrationName

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || (isCustom && !customToolName) || isSubmitting) return

        setIsSubmitting(true)
        setFailed(false)
        if (!feedbackIdRef.current) feedbackIdRef.current = crypto.randomUUID()

        // Analytics records WHICH provider was asked for — never who asked.
        gtag.event({
            action: 'provider_email_submit',
            event_category: 'providers',
            event_label: isCustom ? `Custom: ${customToolName}` : providerName,
        })

        const ok = await submitProviderInterest({
            email,
            providerName,
            isCustom,
            feedbackId: feedbackIdRef.current,
            website,
        })
        setIsSubmitting(false)

        if (!ok) {
            // Keep every field and the same feedbackId so Retry is idempotent.
            setFailed(true)
            return
        }

        setIsSubmitted(true)
        feedbackIdRef.current = ''
        closeTimer.current = setTimeout(() => {
            onClose()
            setEmail('')
            setCustomToolName('')
            setWebsite('')
            setIsSubmitted(false)
        }, 2000)
    }

    return (
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-black/5 dark:border-white/10"
                        onClick={e => e.stopPropagation()}
                    >
                        {!isSubmitted ? (
                            <>
                                <motion.div
                                    className="flex items-center justify-between mb-6"
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                        {isCustom
                                            ? 'Request Custom Provider'
                                            : `Get notified for ${integrationName}`}
                                    </h3>
                                    <motion.button
                                        onClick={onClose}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <FaTimes className="w-4 h-4 text-gray-500" />
                                    </motion.button>
                                </motion.div>

                                <motion.p
                                    className="text-gray-600 dark:text-gray-400 mb-6"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {isCustom
                                        ? "Tell us which storage provider you'd like us to integrate with upup and we'll notify you when it's ready."
                                        : `We'll send you an email as soon as the ${integrationName} integration is ready for beta testing.`}
                                </motion.p>

                                <motion.form
                                    onSubmit={handleSubmit}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    {isCustom && (
                                        <motion.input
                                            type="text"
                                            value={customToolName}
                                            onChange={e =>
                                                setCustomToolName(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Provider name (e.g., MinIO, Wasabi, IBM Cloud)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 mb-4"
                                            required
                                            initial={{ x: -10, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                        />
                                    )}

                                    <motion.input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 mb-4"
                                        required
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{
                                            delay: isCustom ? 0.5 : 0.4,
                                        }}
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

                                    <motion.div
                                        className="flex gap-3"
                                        initial={{ y: 10, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay: isCustom ? 0.6 : 0.5,
                                        }}
                                    >
                                        <motion.button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-xl border border-black/5 dark:border-white/10 hover:border-black/10 dark:hover:border-white/20"
                                        >
                                            Cancel
                                        </motion.button>
                                        <motion.button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-3 bg-primary hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
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
                                        </motion.button>
                                    </motion.div>
                                </motion.form>
                            </>
                        ) : (
                            <motion.div
                                className="text-center"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    type: 'spring',
                                    damping: 20,
                                    stiffness: 300,
                                }}
                            >
                                <motion.div
                                    className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                        delay: 0.2,
                                        type: 'spring',
                                        damping: 15,
                                        stiffness: 400,
                                    }}
                                >
                                    <motion.div
                                        className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            delay: 0.4,
                                            type: 'spring',
                                            damping: 15,
                                            stiffness: 400,
                                        }}
                                    >
                                        <motion.svg
                                            className="w-4 h-4 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{
                                                delay: 0.6,
                                                duration: 0.3,
                                            }}
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M5 13l4 4L19 7"
                                            />
                                        </motion.svg>
                                    </motion.div>
                                </motion.div>
                                <motion.h3
                                    className="text-xl font-bold text-gray-900 dark:text-white mb-2"
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    You&apos;re all set!
                                </motion.h3>
                                <motion.p
                                    className="text-gray-600 dark:text-gray-400"
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    {`We’ll email you when ${providerName} integration is ready.`}
                                </motion.p>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
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
                                <span className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">
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
    onProviderClick: (provider: Integration) => void
    onCustomRequest: () => void
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
                    onClick={() => onProviderClick(provider)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-black/10 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <provider.icon className="w-3.5 h-3.5" aria-hidden />
                    {provider.name}
                </button>
            ))}
            <button
                type="button"
                onClick={onCustomRequest}
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

    const handleProviderClick = (provider: Integration) => {
        if (provider.status === 'supported') return // Don't show modal for supported providers

        // Track the interest in analytics. Status rides the label, not `value`
        // — GA4's `value` is the numeric parameter.
        gtag.event({
            action: 'provider_interest',
            event_category: 'providers',
            event_label: `${provider.name} (${provider.status})`,
        })

        setSelectedProvider(provider.name)
        setIsCustomRequest(false)
        setModalOpen(true)
    }

    const handleCustomRequest = () => {
        gtag.event({
            action: 'request_provider',
            event_category: 'providers',
            event_label: 'custom_request',
        })
        setSelectedProvider('Custom Provider')
        setIsCustomRequest(true)
        setModalOpen(true)
    }

    return (
        <Section id="features">
            {/* Marquee keyframes + reduced-motion stop for the file-type strip */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0) }
                    100% { transform: translateX(-50%) }
                }
                .animate-marquee {
                    animation: marquee 25s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
                @media (prefers-reduced-motion: reduce) {
                    .animate-marquee { animation: none; }
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
                            also support some non-S3 connections.
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
            />
        </Section>
    )
}
