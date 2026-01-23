import { test as baseTest, expect } from '@playwright/test';
import { UploaderPage } from '../pages/UploaderPage';

type UpupPageObjects = {
  uploaderPage: UploaderPage;
};

export const test = baseTest.extend<UpupPageObjects>({
  uploaderPage: async ({ page }, use) => {
    const uploaderPage = new UploaderPage(page);
    await use(uploaderPage);
  },
});

export { expect };