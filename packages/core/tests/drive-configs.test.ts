import { describe, it, expectTypeOf } from 'vitest'
import type {
    GoogleDriveConfig,
    OneDriveConfig,
    DropboxConfig,
    BoxConfig,
    CloudDrivesConfig,
} from '../src'

describe('drive configs exported from core (one camelCase shape)', () => {
    it('GoogleDriveConfig requires clientId/apiKey/appId', () => {
        expectTypeOf<GoogleDriveConfig>().toMatchTypeOf<{
            clientId: string
            apiKey: string
            appId: string
        }>()
    })
    it('GoogleDriveConfig accepts an optional sharedDrives flag and still typechecks without it (#391)', () => {
        const withoutFlag: GoogleDriveConfig = {
            clientId: 'g',
            apiKey: 'k',
            appId: 'a',
        }
        const withFlag: GoogleDriveConfig = {
            clientId: 'g',
            apiKey: 'k',
            appId: 'a',
            sharedDrives: true,
        }
        expectTypeOf(withoutFlag).toMatchTypeOf<GoogleDriveConfig>()
        expectTypeOf(withFlag).toMatchTypeOf<GoogleDriveConfig>()
        expectTypeOf<GoogleDriveConfig['sharedDrives']>().toEqualTypeOf<
            boolean | undefined
        >()
    })
    it('OneDriveConfig requires clientId; redirectUri optional', () => {
        const _: OneDriveConfig = { clientId: 'c' }
        expectTypeOf(_).toMatchTypeOf<OneDriveConfig>()
        expectTypeOf<OneDriveConfig>().toMatchTypeOf<{ clientId: string }>()
    })
    it('DropboxConfig requires clientId; redirectUri optional', () => {
        const _: DropboxConfig = { clientId: 'c' }
        expectTypeOf(_).toMatchTypeOf<DropboxConfig>()
    })
    it('BoxConfig requires clientId; redirectUri optional', () => {
        const _: BoxConfig = { clientId: 'c' }
        expectTypeOf(_).toMatchTypeOf<BoxConfig>()
    })
    it('CloudDrivesConfig covers all four drives', () => {
        const _: CloudDrivesConfig = {
            googleDrive: { clientId: 'g', apiKey: 'k', appId: 'a' },
            oneDrive: { clientId: 'o' },
            dropbox: { clientId: 'd', redirectUri: 'r' },
            box: { clientId: 'b' },
        }
        expectTypeOf(_).toMatchTypeOf<CloudDrivesConfig>()
    })
})
