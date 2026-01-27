import { Page } from '@playwright/test';

export interface MockUploadApi {
  getUploadCount: () => number;
  waitForUploads: (count: number) => Promise<void>;
}

export async function setupMockUploadApi(page: Page): Promise<MockUploadApi> {
  let uploadCount = 0;

  await page.route('**/api/upload**', async route => {
    uploadCount++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        key: `mock-upload-key-${uploadCount}`,
        url: `https://mock-storage.com/file-${uploadCount}.png`
      })
    });
  });

  return {
    getUploadCount: () => uploadCount,
    waitForUploads: async (count: number) => {
      const promises = Array.from({ length: count }, () =>
        page.waitForResponse(r => r.url().includes('/api/upload') && r.status() === 200)
      );
      await Promise.all(promises);
    }
  };
}
