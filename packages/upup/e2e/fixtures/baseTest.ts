import { test as baseTest, expect } from '@playwright/test'
import { UploaderPage } from '../pages/UploaderPage'
import { MockUploadApi, setupMockUploadApi } from './mockUploadApi'

type UpupPageObjects = {
    uploaderPage: UploaderPage
    mockUploadApi: MockUploadApi
}

export const test = baseTest.extend<UpupPageObjects>({
    uploaderPage: async ({ page }, use) => {
        const uploaderPage = new UploaderPage(page)
        await use(uploaderPage)
    },
    mockUploadApi: async ({ page }, use) => {
        const mockApi = await setupMockUploadApi(page)
        await use(mockApi)
    },
})

export { expect }
