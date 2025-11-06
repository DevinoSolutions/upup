'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  FaCloud,
  FaUpload,
  FaEye,
  FaGlobe,
  FaBolt,
  FaShieldAlt,
  FaFileAlt,
  FaStar,
  FaTimes,
  FaSpinner,
  FaRoad,
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
  FaPhotoVideo
} from 'react-icons/fa';
import {
  SiAmazonwebservices,
  SiDigitalocean,
  SiBackblaze,
  SiGoogledrive,
  SiAdobephotoshop,
  SiAdobepremierepro,
  SiSpotify,
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
  SiOracle
} from 'react-icons/si';
import { GrOnedrive } from "react-icons/gr";
import { VscAzure } from "react-icons/vsc";
import { ImFileZip } from "react-icons/im";
import * as gtag from '@/lib/gtag';

interface Integration {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  status: 'supported' | 'in-development' | 'planned';
  description: string;
  category: string;
  color: string; // Brand color for the icon
}

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationName: string;
  onSubmit: (email: string, customToolName?: string) => void;
  isCustom?: boolean;
}

const mainFeatures = [
  {
    icon: <FaCloud className="w-6 h-6" />,
    title: 'Multi-Cloud Support',
    description: 'Connect to AWS S3, DigitalOcean Spaces, Backblaze B2, Azure Blob, and more cloud providers'
  },
  {
    icon: <FaUpload className="w-6 h-6" />,
    title: 'Drag & Drop Interface',
    description: 'Intuitive file management with smooth drag and drop functionality built for modern UX'
  },
  {
    icon: <FaEye className="w-6 h-6" />,
    title: 'Instant Previews',
    description: 'Preview images, documents, and media files instantly before uploading to save time'
  },
  {
    icon: <FaGlobe className="w-6 h-6" />,
    title: 'Cloud Integration',
    description: 'Upload directly from Google Drive, OneDrive, and other cloud storage services'
  },
  {
    icon: <FaBolt className="w-6 h-6" />,
    title: 'Performance Optimized',
    description: 'Built for speed with compression, chunked uploads, and optimized loading states'
  },
  {
    icon: <FaShieldAlt className="w-6 h-6" />,
    title: 'Enterprise Security',
    description: 'Pre-signed URLs, CORS protection, and enterprise-grade security out of the box'
  }
];

// User Storage Providers - for end users to connect their personal cloud storage
const userStorageProviders: Integration[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    icon: SiGoogledrive,
    status: 'supported',
    description: 'Direct access to files',
    category: 'User Storage',
    color: '#4285F4'
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    icon: GrOnedrive,
    status: 'supported',
    description: 'Microsoft cloud storage',
    category: 'User Storage',
    color: '#0078D4'
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    icon: SiDropbox,
    status: 'supported',
    description: 'Cloud file sharing',
    category: 'User Storage',
    color: '#0061FF'
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: FaInstagram,
    status: 'planned',
    description: 'Import photos and videos',
    category: 'User Storage',
    color: '#E4405F'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: FaFacebook,
    status: 'planned',
    description: 'Access photos and videos',
    category: 'User Storage',
    color: '#1877F2'
  },
  {
    id: 'zoom',
    name: 'Zoom',
    icon: SiZoom,
    status: 'planned',
    description: 'Upload recordings',
    category: 'User Storage',
    color: '#2D8CFF'
  },
  {
    id: 'google-photos',
    name: 'Google Photos Picker',
    icon: FaPhotoVideo,
    status: 'planned',
    description: 'Photos picker integration',
    category: 'User Storage',
    color: '#4285F4'
  },
  {
    id: 'icloud',
    name: 'iCloud Drive',
    icon: FaApple,
    status: 'planned',
    description: 'Apple cloud storage',
    category: 'User Storage',
    color: '#007AFF'
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    icon: FaPinterest,
    status: 'planned',
    description: 'Import images',
    category: 'User Storage',
    color: '#E60023'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: FaTiktok,
    status: 'planned',
    description: 'Upload videos',
    category: 'User Storage',
    color: '#FF0050'
  }
];

// Developer Storage Providers - for developers to connect their cloud buckets
const developerStorageProviders: Integration[] = [
  {
    id: 'aws',
    name: 'AWS S3',
    icon: SiAmazonwebservices,
    status: 'supported',
    description: 'Amazon S3 buckets',
    category: 'Developer Storage',
    color: '#FF9900'
  },
  {
    id: 'azure',
    name: 'Azure Blob',
    icon: VscAzure,
    status: 'supported',
    description: 'Microsoft Azure storage',
    category: 'Developer Storage',
    color: '#0078D4'
  },
  {
    id: 'backblaze',
    name: 'Backblaze B2',
    icon: SiBackblaze,
    status: 'supported',
    description: 'Cost-effective storage',
    category: 'Developer Storage',
    color: '#E21E3A'
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean',
    icon: SiDigitalocean,
    status: 'supported',
    description: 'Spaces object storage',
    category: 'Developer Storage',
    color: '#0080FF'
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare R2',
    icon: SiCloudflare,
    status: 'supported',
    description: 'R2 object storage',
    category: 'Developer Storage',
    color: '#F38020'
  },
  {
    id: 'wasabi',
    name: 'Wasabi Hot Cloud Storage',
    icon: SiWasabi,
    status: 'supported',
    description: 'Hot cloud storage',
    category: 'Developer Storage',
    color: '#00B04F'
  },
  {
    id: 'linode',
    name: 'Linode Object Storage',
    icon: FaServer,
    status: 'supported',
    description: 'Linode object storage',
    category: 'Developer Storage',
    color: '#00A95C'
  },
  {
    id: 'idrive',
    name: 'IDrive e2',
    icon: FaDatabase,
    status: 'supported',
    description: 'IDrive object storage',
    category: 'Developer Storage',
    color: '#2B5A87'
  },
  {
    id: 'hetzner',
    name: 'Hetzner Object Storage',
    icon: SiHetzner,
    status: 'supported',
    description: 'Hetzner cloud storage',
    category: 'Developer Storage',
    color: '#D50C2D'
  },
  {
    id: 'scaleway',
    name: 'Scaleway Object Storage',
    icon: SiScaleway,
    status: 'supported',
    description: 'Scaleway cloud storage',
    category: 'Developer Storage',
    color: '#4F0599'
  },
  {
    id: 'oracle',
    name: 'Oracle Cloud Object Storage',
    icon: SiOracle,
    status: 'supported',
    description: 'Oracle cloud storage',
    category: 'Developer Storage',
    color: '#F80000'
  },
  {
    id: 'alibaba',
    name: 'Alibaba Cloud OSS',
    icon: SiAlibabadotcom,
    status: 'supported',
    description: 'Alibaba Cloud OSS',
    category: 'Developer Storage',
    color: '#FF6A00'
  },
  {
    id: 'minio',
    name: 'MinIO',
    icon: SiMinio,
    status: 'supported',
    description: 'Self-hosted storage',
    category: 'Developer Storage',
    color: '#C72E29'
  },
  {
    id: 'gcp',
    name: 'Google Cloud Storage',
    icon: FaGoogle,
    status: 'planned',
    description: 'Google Cloud storage',
    category: 'Developer Storage',
    color: '#4285F4'
  },
  {
    id: 'vercel',
    name: 'Vercel Blob',
    icon: SiVercel,
    status: 'planned',
    description: 'Vercel blob storage',
    category: 'Developer Storage',
    color: '#000000'
  },
  {
    id: 'supabase',
    name: 'Supabase',
    icon: SiSupabase,
    status: 'planned',
    description: 'Supabase storage',
    category: 'Developer Storage',
    color: '#3ECF8E'
  },
  {
    id: 'ibm',
    name: 'IBM Cloud Object Storage',
    icon: FaCube,
    status: 'planned',
    description: 'IBM cloud storage',
    category: 'Developer Storage',
    color: '#1261FE'
  }
];

const fileTypes = [
  {
    icon: <SiAdobephotoshop className="w-8 h-8" />,
    label: 'Images',
    types: 'JPG, PNG, GIF, WebP',
    color: 'text-[#31A8FF]',
    bgColor: 'bg-[#31A8FF]/10',
    borderColor: 'border-[#31A8FF]/20',
    hoverColor: 'hover:bg-[#31A8FF]/20'
  },
  {
    icon: <FaFileAlt className="w-8 h-8" />,
    label: 'Documents',
    types: 'PDF, DOC, DOCX, TXT',
    color: 'text-[#DC3545]',
    bgColor: 'bg-[#DC3545]/10',
    borderColor: 'border-[#DC3545]/20',
    hoverColor: 'hover:bg-[#DC3545]/20'
  },
  {
    icon: <SiAdobepremierepro className="w-8 h-8" />,
    label: 'Videos',
    types: 'MP4, AVI, MOV, WebM',
    color: 'text-[#9999FF]',
    bgColor: 'bg-[#9999FF]/10',
    borderColor: 'border-[#9999FF]/20',
    hoverColor: 'hover:bg-[#9999FF]/20'
  },
  {
    icon: <SiSpotify className="w-8 h-8" />,
    label: 'Audio',
    types: 'MP3, WAV, OGG, FLAC',
    color: 'text-[#1DB954]',
    bgColor: 'bg-[#1DB954]/10',
    borderColor: 'border-[#1DB954]/20',
    hoverColor: 'hover:bg-[#1DB954]/20'
  },
  {
    icon: <ImFileZip className="w-8 h-8" />,
    label: 'Archives',
    types: 'ZIP, RAR, 7Z, TAR',
    color: 'text-[#FFA500]',
    bgColor: 'bg-[#FFA500]/10',
    borderColor: 'border-[#FFA500]/20',
    hoverColor: 'hover:bg-[#FFA500]/20'
  },
  {
    icon: <SiJavascript className="w-8 h-8" />,
    label: 'Code',
    types: 'JS, TS, JSON, XML',
    color: 'text-[#F7DF1E]',
    bgColor: 'bg-[#F7DF1E]/10',
    borderColor: 'border-[#F7DF1E]/20',
    hoverColor: 'hover:bg-[#F7DF1E]/20'
  }
];

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, integrationName, onSubmit, isCustom = false }) => {
  const [email, setEmail] = useState('');
  const [customToolName, setCustomToolName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (isCustom && !customToolName)) return;

    setIsSubmitting(true);

    // Track email submission
    gtag.event({
      action: 'provider_email_submit',
      event_category: 'providers',
      event_label: isCustom ? `Custom: ${customToolName}` : integrationName,
      value: email
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    onSubmit(email, isCustom ? customToolName : undefined);
    setIsSubmitted(true);
    setIsSubmitting(false);

    setTimeout(() => {
      onClose();
      setEmail('');
      setCustomToolName('');
      setIsSubmitted(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
      <AnimatePresence>
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
          <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl"
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
                      {isCustom ? 'Request Custom Provider' : `Get notified for ${integrationName}`}
                    </h3>
                    <motion.button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
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
                        ? "Tell us which storage provider you'd like us to integrate with UpUp and we'll notify you when it's ready."
                        : `We'll send you an email as soon as the ${integrationName} integration is ready for beta testing.`
                    }
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
                            onChange={(e) => setCustomToolName(e.target.value)}
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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 mb-4"
                        required
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: isCustom ? 0.5 : 0.4 }}
                    />

                    <motion.div
                        className="flex gap-3"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: isCustom ? 0.6 : 0.5 }}
                    >
                      <motion.button
                          type="button"
                          onClick={onClose}
                          className="flex-1 px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-xl border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                          type="submit"
                          disabled={isSubmitting}
                          className="flex-1 px-4 py-3 bg-primary hover:opacity-90 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                      >
                        {isSubmitting ? (
                            <>
                              <FaSpinner className="w-4 h-4 animate-spin" />
                              {isCustom ? 'Requesting...' : 'Subscribing...'}
                            </>
                        ) : (
                            isCustom ? 'Request Provider' : 'Notify me'
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
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                >
                  <motion.div
                      className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", damping: 15, stiffness: 400 }}
                  >
                    <motion.div
                        className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.4, type: "spring", damping: 15, stiffness: 400 }}
                    >
                      <motion.svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: 0.6, duration: 0.3 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                    {isCustom
                        ? `We&apos;ll email you when ${customToolName} integration is ready.`
                        : `We&apos;ll email you when ${integrationName} integration is ready.`
                    }
                  </motion.p>
                </motion.div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
  );
};

export default function HomepageFeatures() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isCustomRequest, setIsCustomRequest] = useState(false);

  // Refs for scroll-triggered animations
  const headerRef = useRef(null);
  const featuresRef = useRef(null);
  const providersRef = useRef(null);
  const fileTypesRef = useRef(null);

  const headerInView = useInView(headerRef, { once: true, amount: 0.3 });
  const featuresInView = useInView(featuresRef, { once: true, amount: 0.2 });
  const providersInView = useInView(providersRef, { once: true, amount: 0.2 });
  const fileTypesInView = useInView(fileTypesRef, { once: true, amount: 0.3 });

  const easeCurve: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: easeCurve
      }
    }
  };

  const badgeVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: easeCurve
      }
    }
  };

  const headingVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: easeCurve
      }
    }
  };

  const providerGridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.2
      }
    }
  };

  const providerItemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: easeCurve
      }
    }
  };

  const handleProviderClick = (provider: Integration) => {
    if (provider.status === 'supported') return; // Don't show modal for supported providers

    // Track the interest in analytics
    gtag.event({
      action: 'provider_interest',
      event_category: 'providers',
      event_label: provider.name,
      value: provider.status
    });

    setSelectedProvider(provider.name);
    setIsCustomRequest(false);
    setModalOpen(true);
  };

  const handleCustomRequest = () => {
    gtag.event({
      action: 'request_provider',
      event_category: 'providers',
      event_label: 'custom_request'
    });
    setSelectedProvider('Custom Provider');
    setIsCustomRequest(true);
    setModalOpen(true);
  };

  const handleEmailSubmit = (email: string, customToolName?: string) => {
    if (customToolName) {
      console.log(`Email ${email} requested custom provider for ${customToolName}`);
    } else {
      console.log(`Email ${email} subscribed for ${selectedProvider} provider`);
    }
    // Here you would typically send this to your backend
  };

  return (
      <section id="features" className="py-24 px-6 relative overflow-hidden">
        {/* Add custom CSS for marquee animation */}
        <style jsx>{`
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
        `}</style>

        <div className="relative max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
              ref={headerRef}
              className="text-center mb-20"
              variants={containerVariants}
              initial="hidden"
              animate={headerInView ? "visible" : "hidden"}
          >
            <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-sm font-medium text-gray-700 dark:text-gray-300 mb-8"
                variants={badgeVariants}
                whileHover={{ scale: 1.05 }}
            >
              <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <FaStar className="w-4 h-4 text-primary dark:text-primary-dark"/>
              </motion.div>
              Powerful Features
            </motion.div>

            <motion.h2
                className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-6"
                variants={headingVariants}
            >
              Everything you need for
              <motion.span
                  className="block bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent"
                  initial={{ backgroundPosition: "0% 50%" }}
                  animate={{ backgroundPosition: "100% 50%" }}
                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              >
                modern file uploads
              </motion.span>
            </motion.h2>

            <motion.p
                className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto"
                variants={itemVariants}
            >
              From simple drag-and-drop to enterprise-grade cloud integrations,
              built for developers who care about user experience.
            </motion.p>
          </motion.div>

          {/* Main Features Grid */}
          <motion.div
              ref={featuresRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24"
              variants={containerVariants}
              initial="hidden"
              animate={featuresInView ? "visible" : "hidden"}
          >
            {mainFeatures.map((feature, index) => (
                <motion.div
                    key={index}
                    className="group p-8 shadow-md bg-white dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10 rounded-3xl hover:bg-white/20 dark:hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 dark:hover:shadow-white/5 hover:border-white/30 dark:hover:border-white/20"
                    variants={itemVariants}
                    whileHover={{
                      y: -8,
                      transition: { duration: 0.2 }
                    }}
                >
                  <motion.div
                      className="w-12 h-12 bg-primary/10 dark:bg-primary-dark/10 rounded-2xl flex items-center justify-center text-primary dark:text-primary-dark mb-6 group-hover:bg-primary/20 dark:group-hover:bg-primary-dark/20 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    {feature.icon}
                  </motion.div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
            ))}
          </motion.div>

          {/* Cloud Providers Section */}
          <motion.div
              ref={providersRef}
              className="mb-24"
              initial="hidden"
              animate={providersInView ? "visible" : "hidden"}
          >
            {/* User Storage Providers */}
            <motion.div
                className="mb-20"
                variants={containerVariants}
            >
              <motion.div
                  className="text-center mb-12"
                  variants={containerVariants}
              >
                <motion.h3
                    className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
                    variants={headingVariants}
                >
                  Let your users connect to their favorite storage cloud providers
                </motion.h3>
                <motion.p
                    className="text-lg text-gray-600 dark:text-gray-300"
                    variants={itemVariants}
                >
                  Users can directly upload from these providers in UpUp
                </motion.p>
              </motion.div>

              <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8"
                  variants={providerGridVariants}
              >
                {userStorageProviders.map((provider, index) => (
                    <motion.div
                        key={provider.id}
                        className={`group shadow-md dark:shadow-none bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-white/10 hover:border-white/30 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg relative overflow-hidden ${
                            provider.status === 'supported' ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        onClick={() => handleProviderClick(provider)}
                        variants={providerItemVariants}
                        whileHover={{
                          y: -4,
                          scale: 1.02,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                      {/* Status Badge */}
                      {provider.status === 'supported' && (
                          <motion.div
                              className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full z-10"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.3 }}
                          >
                            <motion.div
                                className="w-1.5 h-1.5 bg-green-500 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span className="text-[9px] font-medium text-green-700 dark:text-green-300">
                              Supported
                            </span>
                          </motion.div>
                      )}

                      {provider.status === 'planned' && (
                          <motion.div
                              className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full z-10"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.3 }}
                          >
                            <FaRoad className="w-1.5 h-1.5 text-blue-600 dark:text-blue-400"/>
                            <span className="text-[9px] font-medium text-blue-700 dark:text-blue-300">
                              Planned
                            </span>
                          </motion.div>
                      )}

                      {/* Icon and Title */}
                      <div className="flex items-start gap-3 relative z-10">
                        <motion.div
                            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ backgroundColor: provider.color }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <provider.icon className="w-5 h-5 text-white"/>
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {provider.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {provider.description}
                          </p>
                        </div>
                      </div>

                      {/* Hover Overlay for non-supported providers */}
                      {provider.status !== 'supported' && (
                          <motion.div
                              className="absolute inset-0 bg-gray-900/90 z-50 dark:bg-gray-800/95 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center backdrop-blur-sm"
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                          >
                            <div className="text-center px-3">
                              <motion.div
                                  className="text-sm font-semibold text-white"
                                  initial={{ y: 10 }}
                                  whileHover={{ y: 0 }}
                                  transition={{ duration: 0.2 }}
                              >
                                <span>I want this!</span>
                              </motion.div>
                            </div>
                          </motion.div>
                      )}
                    </motion.div>
                ))}

                {/* Custom Provider Request Card for User Storage */}
                <motion.div
                    className="group shadow-md dark:shadow-none bg-white/5 dark:bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 border-2 border-dashed border-white/30 dark:border-white/20 hover:border-white/50 dark:hover:border-white/30 transition-all duration-300 hover:shadow-lg relative overflow-hidden cursor-pointer"
                    onClick={handleCustomRequest}
                    variants={providerItemVariants}
                    whileHover={{
                      y: -4,
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3 relative z-10">
                    <motion.div
                        className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-md flex items-center justify-center group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors flex-shrink-0"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <FaPlus className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm truncate">
                        Request Custom
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Tell us what you need!
                      </p>
                    </div>
                  </div>

                  <motion.div
                      className="absolute inset-0 bg-gray-900/90 z-50 dark:bg-gray-800/95 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                  >
                    <div className="text-center px-3">
                      <motion.div
                          className="text-sm font-semibold text-white"
                          initial={{ y: 10 }}
                          whileHover={{ y: 0 }}
                          transition={{ duration: 0.2 }}
                      >
                        <span>Tell us what you need!</span>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Developer Storage Providers */}
            <motion.div
                variants={containerVariants}
            >
              <motion.div
                  className="text-center mb-12"
                  variants={containerVariants}
              >
                <motion.h3
                    className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
                    variants={headingVariants}
                >
                  And for developers, connect upup to your favorite cloud bucket
                </motion.h3>
                <motion.p
                    className="text-lg text-gray-600 dark:text-gray-300"
                    variants={itemVariants}
                >
                  You can connect to UpUp using any S3 provider. We also support some non-S3 connections.
                </motion.p>
              </motion.div>

              <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8"
                  variants={providerGridVariants}
              >
                {developerStorageProviders.map((provider, index) => (
                    <motion.div
                        key={provider.id}
                        className={`group shadow-md dark:shadow-none bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/20 dark:border-white/10 hover:border-white/30 dark:hover:border-white/20 transition-all duration-300 hover:shadow-lg relative overflow-hidden ${
                            provider.status === 'supported' ? 'cursor-default' : 'cursor-pointer'
                        }`}
                        onClick={() => handleProviderClick(provider)}
                        variants={providerItemVariants}
                        whileHover={{
                          y: -4,
                          scale: 1.02,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                    >
                      {/* Status Badge */}
                      {provider.status === 'supported' && (
                          <motion.div
                              className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full z-10"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.3 }}
                          >
                            <motion.div
                                className="w-1.5 h-1.5 bg-green-500 rounded-full"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            />
                            <span className="text-[9px] font-medium text-green-700 dark:text-green-300">
                              Supported
                            </span>
                          </motion.div>
                      )}

                      {provider.status === 'planned' && (
                          <motion.div
                              className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full z-10"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: index * 0.05 + 0.3 }}
                          >
                            <FaRoad className="w-1.5 h-1.5 text-blue-600 dark:text-blue-400"/>
                            <span className="text-[9px] font-medium text-blue-700 dark:text-blue-300">
                              Planned
                            </span>
                          </motion.div>
                      )}

                      {/* Icon and Title */}
                      <div className="flex items-start gap-3 relative z-10">
                        <motion.div
                            className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 transition-colors"
                            style={{ backgroundColor: provider.color }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <provider.icon className="w-5 h-5 text-white"/>
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {provider.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                            {provider.description}
                          </p>
                        </div>
                      </div>

                      {/* Hover Overlay for non-supported providers */}
                      {provider.status !== 'supported' && (
                          <motion.div
                              className="absolute inset-0 bg-gray-900/90 z-50 dark:bg-gray-800/95 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center backdrop-blur-sm"
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1 }}
                          >
                            <div className="text-center px-3">
                              <motion.div
                                  className="text-sm font-semibold text-white"
                                  initial={{ y: 10 }}
                                  whileHover={{ y: 0 }}
                                  transition={{ duration: 0.2 }}
                              >
                                <span>I want this!</span>
                              </motion.div>
                            </div>
                          </motion.div>
                      )}
                    </motion.div>
                ))}

                {/* Custom Provider Request Card for Developer Storage */}
                <motion.div
                    className="group shadow-md dark:shadow-none bg-white/5 dark:bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 border-2 border-dashed border-white/30 dark:border-white/20 hover:border-white/50 dark:hover:border-white/30 transition-all duration-300 hover:shadow-lg relative overflow-hidden cursor-pointer"
                    onClick={handleCustomRequest}
                    variants={providerItemVariants}
                    whileHover={{
                      y: -4,
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3 relative z-10">
                    <motion.div
                        className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-md flex items-center justify-center group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors flex-shrink-0"
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <FaPlus className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm truncate">
                        Request Custom
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Tell us what you need!
                      </p>
                    </div>
                  </div>

                  <motion.div
                      className="absolute inset-0 bg-gray-900/90 z-50 dark:bg-gray-800/95 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-lg flex items-center justify-center backdrop-blur-sm"
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                  >
                    <div className="text-center px-3">
                      <motion.div
                          className="text-sm font-semibold text-white"
                          initial={{ y: 10 }}
                          whileHover={{ y: 0 }}
                          transition={{ duration: 0.2 }}
                      >
                        <span>Tell us what you need!</span>
                      </motion.div>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* File Types with Modern Infinite Marquee */}
          <motion.div
              ref={fileTypesRef}
              initial="hidden"
              animate={fileTypesInView ? "visible" : "hidden"}
          >
            <motion.div
                className="text-center mb-16"
                variants={containerVariants}
            >
              <motion.h3
                  className="text-3xl font-bold text-gray-900 dark:text-white mb-4"
                  variants={headingVariants}
              >
                Support for all file types
              </motion.h3>
              <motion.p
                  className="text-lg text-gray-600 dark:text-gray-300"
                  variants={itemVariants}
              >
                Handle any file format your users need to upload
              </motion.p>
            </motion.div>

            {/* Modern Infinite Marquee with Scroll-triggered Animation */}
            <motion.div
                className="relative overflow-hidden py-8"
                initial={{ opacity: 0 }}
                animate={fileTypesInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="flex animate-marquee">
                {/* First set of items */}
                {fileTypes.map((type, index) => (
                    <motion.div
                        key={`first-${index}`}
                        className={`group relative text-center p-8 mx-4 min-w-[200px] shadow-md dark:shadow-none ${type.bgColor} backdrop-blur-sm border ${type.borderColor} rounded-3xl ${type.hoverColor} hover:scale-105 hover:shadow-lg transition-all duration-300 flex-shrink-0`}
                        initial={{
                          opacity: 0,
                          y: 30,
                          scale: 0.9
                        }}
                        animate={fileTypesInView ? {
                          opacity: 1,
                          y: 0,
                          scale: 1
                        } : {}}
                        transition={{
                          duration: 0.6,
                          delay: index * 0.1 + 0.6,
                          ease: easeCurve
                        }}
                        whileHover={{
                          scale: 1.05,
                          y: -5,
                          transition: { duration: 0.2 }
                        }}
                    >
                      <motion.div
                          className={`flex justify-center mb-6 ${type.color} group-hover:scale-110 transition-transform duration-300`}
                          whileHover={{ rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        {type.icon}
                      </motion.div>
                      <div className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                        {type.label}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {type.types}
                      </div>

                      <motion.div
                          className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ x: "-100%" }}
                          whileHover={{
                            x: "100%",
                            transition: { duration: 0.6 }
                          }}
                      />
                    </motion.div>
                ))}

                {/* Second set of items for seamless loop */}
                {fileTypes.map((type, index) => (
                    <motion.div
                        key={`second-${index}`}
                        className={`group relative text-center p-8 mx-4 min-w-[200px] shadow-md dark:shadow-none ${type.bgColor} backdrop-blur-sm border ${type.borderColor} rounded-3xl ${type.hoverColor} hover:scale-105 hover:shadow-lg transition-all duration-300 flex-shrink-0`}
                        initial={{
                          opacity: 0,
                          y: 30,
                          scale: 0.9
                        }}
                        animate={fileTypesInView ? {
                          opacity: 1,
                          y: 0,
                          scale: 1
                        } : {}}
                        transition={{
                          duration: 0.6,
                          delay: (index + fileTypes.length) * 0.1 + 0.6,
                          ease: easeCurve
                        }}
                        whileHover={{
                          scale: 1.05,
                          y: -5,
                          transition: { duration: 0.2 }
                        }}
                    >
                      <motion.div
                          className={`flex justify-center mb-6 ${type.color} group-hover:scale-110 transition-transform duration-300`}
                          whileHover={{ rotate: 5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        {type.icon}
                      </motion.div>
                      <div className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                        {type.label}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">
                        {type.types}
                      </div>

                      <motion.div
                          className="absolute inset-0 rounded-3xl bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={{ x: "-100%" }}
                          whileHover={{
                            x: "100%",
                            transition: { duration: 0.6 }
                          }}
                      />
                    </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <EmailModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            integrationName={selectedProvider || ''}
            onSubmit={handleEmailSubmit}
            isCustom={isCustomRequest}
        />
      </section>
  );
}
