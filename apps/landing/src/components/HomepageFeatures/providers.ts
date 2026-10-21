import {
    FaInstagram,
    FaFacebook,
    FaApple,
    FaPinterest,
    FaTiktok,
    FaGoogle,
    FaPhotoVideo,
} from 'react-icons/fa'
import {
    SiAmazonwebservices,
    SiDigitalocean,
    SiBackblaze,
    SiBox,
    SiGoogledrive,
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
import { IbmLogo, IDriveLogo, LinodeLogo } from './ProviderLogos'
import type { Integration } from './types'

// User Storage Providers - for end users to connect their personal cloud storage
export const userStorageProviders: Integration[] = [
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
export const developerStorageProviders: Integration[] = [
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
