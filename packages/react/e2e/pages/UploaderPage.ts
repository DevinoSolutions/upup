import { Locator, Page } from '@playwright/test'
import { UploaderLocators as locators } from '../locators/UploaderLocators'

export class UploaderPage {
    readonly page: Page
    readonly fileInput: Locator
    readonly myDeviceBtn: Locator
    readonly addMoreBtn: Locator
    readonly removeAllFilesBtn: Locator
    readonly uploaderRegion: Locator

    constructor(page: Page) {
        this.page = page
        this.fileInput = page.locator(locators.fileInput)
        this.myDeviceBtn = page.getByRole('button', {
            name: locators.myDeviceBtn,
        })
        this.addMoreBtn = page.getByRole('button', {
            name: locators.addMoreBtn,
        })
        this.removeAllFilesBtn = page.getByRole('button', {
            name: locators.removeAllFilesBtn,
        })
        this.uploaderRegion = page.getByLabel(locators.uploaderRegion)
    }

    async goTo(): Promise<void> {
        await this.page.goto('/')
        await this.page.waitForLoadState('domcontentloaded')
        await this.uploaderRegion.waitFor({ state: 'visible' })
    }

    async uploadFiles(files: string[]): Promise<void> {
        await this.fileInput.setInputFiles(files)
    }

    async clickUpload(fileCount: number): Promise<void> {
        const uploadBtn = this.page.getByRole('button', {
            name: `Upload ${fileCount} file${fileCount > 1 ? 's' : ''}`,
        })
        await uploadBtn.click()
    }

    async addMoreFiles(files: string[]): Promise<void> {
        await this.addMoreBtn.click()
        await this.fileInput.setInputFiles(files)
    }

    async removeAllFiles(): Promise<void> {
        await this.removeAllFilesBtn.click()
    }
}
