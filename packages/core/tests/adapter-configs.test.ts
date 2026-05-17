import { describe, it, expectTypeOf } from 'vitest'
import type { GoogleDriveConfigs, OneDriveConfigs, DropboxConfigs, BoxConfigs } from '../src'

describe('adapter configs exported from core', () => {
    it('GoogleDriveConfigs has required google fields', () => {
        expectTypeOf<GoogleDriveConfigs>().toMatchTypeOf<{
            google_api_key: string
            google_app_id: string
            google_client_id: string
        }>()
    })
    it('OneDriveConfigs has onedrive_client_id', () => {
        expectTypeOf<OneDriveConfigs>().toMatchTypeOf<{ onedrive_client_id: string }>()
    })
    it('DropboxConfigs fields are optional', () => {
        const _: DropboxConfigs = {}
        expectTypeOf(_).toMatchTypeOf<DropboxConfigs>()
    })
    it('BoxConfigs fields are optional', () => {
        const _: BoxConfigs = {}
        expectTypeOf(_).toMatchTypeOf<BoxConfigs>()
    })
})
