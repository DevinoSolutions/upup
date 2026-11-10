import { expect, test } from '@playwright/test'

import {
    registerBrowserIssueGuards,
    allowExpectedMockFailure,
    generatedFile,
    uniqueRun,
    openPlayground,
    openCategory,
    checkSidebarCheckbox,
    setNumber,
    fillTextField,
    clickRadio,
    setSizeUnit,
    attachScreenshot,
    readCrashRecoverySnapshot,
    clearCrashRecoverySnapshot,
    selectFiles,
    routeMultipartMock,
} from './playground-deep-helpers'

registerBrowserIssueGuards()

test('routes large server-mode uploads through multipart init, parts, and complete', async ({
    page,
}, testInfo) => {
    const multipart = await routeMultipartMock(page, { partSize: 1024 * 1024 })
    const directObjectRequests: string[] = []
    page.on('request', request => {
        if (
            request.method() === 'PUT' &&
            request.url().includes('/api/upup-mock/object/')
        ) {
            directObjectRequests.push(request.url())
        }
    })

    await openPlayground(page, `?mockRun=${uniqueRun('multipart-threshold')}`)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')

    await selectFiles(page, [
        generatedFile('multipart-threshold.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect
        .poll(async () => ({
            state: await page
                .getByTestId('upup-root')
                .getAttribute('data-state'),
            badResponses: multipart.badResponses,
        }))
        .toMatchObject({ state: 'successful' })

    expect(multipart.initBodies).toHaveLength(1)
    expect(multipart.signBodies.map(body => body.partNumber)).toEqual([
        1, 2, 3, 4, 5, 6,
    ])
    expect(multipart.partNumbers.sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6,
    ])
    expect(multipart.completeBodies).toHaveLength(1)
    expect(
        (
            multipart.completeBodies[0].parts as Array<{ partNumber: number }>
        ).map(part => part.partNumber),
    ).toEqual([1, 2, 3, 4, 5, 6])
    expect(directObjectRequests).toEqual([])
    await attachScreenshot(page, testInfo, 'multipart-threshold-complete')
})

test('retries a multipart upload after one failed part and completes successfully', async ({
    page,
}, testInfo) => {
    allowExpectedMockFailure.add(page)
    const multipart = await routeMultipartMock(page, {
        partSize: 1024 * 1024,
        failPartOnce: 2,
    })

    await openPlayground(page, `?mockRun=${uniqueRun('multipart-retry')}`)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '1')

    await selectFiles(page, [
        generatedFile('multipart-retry.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect
        .poll(async () => ({
            state: await page
                .getByTestId('upup-root')
                .getAttribute('data-state'),
            badResponses: multipart.badResponses,
        }))
        .toMatchObject({ state: 'successful' })

    expect(multipart.failedParts).toEqual([2])
    expect(multipart.initBodies.length).toBeGreaterThanOrEqual(2)
    expect(multipart.abortBodies.length).toBeGreaterThanOrEqual(1)
    expect(multipart.completeBodies).toHaveLength(1)
    await attachScreenshot(
        page,
        testInfo,
        'multipart-failed-part-retry-success',
    )
})

test('pauses, resumes, and cancels slow multipart uploads', async ({
    page,
}, testInfo) => {
    const multipart = await routeMultipartMock(page, {
        partSize: 1024 * 1024,
        delayMs: 1_200,
    })

    await openPlayground(page, `?mockRun=${uniqueRun('multipart-controls')}`)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '0')

    await selectFiles(page, [
        generatedFile('multipart-pause-resume.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Pause',
    )
    await expect(page.getByTestId('upup-upload-cancel-btn')).toBeVisible()
    await expect.poll(() => multipart.signBodies.length).toBeGreaterThan(0)
    await attachScreenshot(page, testInfo, 'multipart-controls-ongoing')

    await page.getByTestId('upup-upload-pause-toggle').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'paused',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Resume',
    )
    await expect(page.getByTestId('upup-root')).toContainText('Paused')
    const signCountWhilePaused = multipart.signBodies.length
    // sleep-allow(negative-assertion window — proves NO further sign-part requests fire while paused; absence has no event to await)
    await page.waitForTimeout(500)
    expect(multipart.signBodies.length).toBe(signCountWhilePaused)
    await expect
        .poll(() => multipart.abortBodies.length)
        .toBeGreaterThanOrEqual(1)
    await attachScreenshot(page, testInfo, 'multipart-controls-paused')

    await page.getByTestId('upup-upload-pause-toggle').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Pause',
    )
    await attachScreenshot(page, testInfo, 'multipart-controls-resumed')

    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    expect(multipart.initBodies.length).toBeGreaterThanOrEqual(2)
    expect(multipart.completeBodies).toHaveLength(1)
    await attachScreenshot(page, testInfo, 'multipart-controls-resume-success')

    await page.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)

    const abortCountBeforeCancel = multipart.abortBodies.length
    await selectFiles(page, [
        generatedFile('multipart-cancel.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-upload-cancel-btn')).toBeVisible()
    await expect
        .poll(() => multipart.initBodies.length)
        .toBeGreaterThanOrEqual(3)
    await attachScreenshot(page, testInfo, 'multipart-controls-cancel-ongoing')

    await page.getByTestId('upup-upload-cancel-btn').click()
    await expect(page.getByTestId('upup-file-item')).toHaveCount(0)
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'idle',
    )
    await expect
        .poll(() => multipart.abortBodies.length)
        .toBeGreaterThan(abortCountBeforeCancel)
    await attachScreenshot(page, testInfo, 'multipart-controls-cancelled')
})

test('restores a crash recovery upload after reload and resumes to success', async ({
    page,
}, testInfo) => {
    const multipart = await routeMultipartMock(page, {
        partSize: 1024 * 1024,
        delayMs: 10_000,
    })

    await openPlayground(page, `?mockRun=${uniqueRun('crash-recovery')}`)
    await clearCrashRecoverySnapshot(page)
    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await checkSidebarCheckbox(page, 'Upload', 'Crash recovery (IndexedDB)')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '0')

    await selectFiles(page, [
        generatedFile('crash-recovery-resume.txt', 6 * 1024 * 1024),
    ])
    await page.getByTestId('upup-upload-btn').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect
        .poll(
            async () => {
                const snapshot = await readCrashRecoverySnapshot(page)
                const status = snapshot?.status
                const file = snapshot?.files?.[0]?.[1]
                const name = file?.name ?? file?.file?.name
                const ready =
                    Array.isArray(snapshot?.files) &&
                    snapshot.files.length === 1 &&
                    name === 'crash-recovery-resume.txt' &&
                    (status === 'PROCESSING' || status === 'UPLOADING')
                return ready
                    ? 'ready'
                    : JSON.stringify({
                          snapshotType:
                              Object.prototype.toString.call(snapshot),
                          keys:
                              snapshot && typeof snapshot === 'object'
                                  ? Object.keys(snapshot)
                                  : [],
                          fileCount: Array.isArray(snapshot?.files)
                              ? snapshot.files.length
                              : 0,
                          status,
                          fileKeys:
                              file && typeof file === 'object'
                                  ? Object.keys(file)
                                  : [],
                          name,
                      })
            },
            { timeout: 20_000 },
        )
        .toBe('ready')
    await expect.poll(() => multipart.signBodies.length).toBeGreaterThan(0)
    await attachScreenshot(page, testInfo, 'crash-recovery-before-reload')

    multipart.setDelayMs(25)
    await page.reload()
    await expect(
        page.getByRole('heading', { name: 'Upup Playground' }),
    ).toBeVisible()
    await expect(page.getByTestId('upup-root')).toBeVisible()

    await openCategory(page, 'Advanced')
    await clickRadio(page, 'Advanced', 'server')
    await fillTextField(page, 'Advanced', 'Server URL', '/api/upup-multipart')

    await openCategory(page, 'Upload')
    await clickRadio(page, 'Upload', 'tus')
    await clickRadio(page, 'Upload', 'multipart')
    await setSizeUnit(page, 'Upload', 'Chunk size', '1', 'MB')
    await setNumber(page, 'Max retries', '0')
    await checkSidebarCheckbox(page, 'Upload', 'Crash recovery (IndexedDB)')

    await expect(page.getByTestId('upup-file-list')).toContainText(
        'crash-recovery-resume.txt',
    )
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'paused',
    )
    await expect(page.getByTestId('upup-upload-pause-toggle')).toHaveAttribute(
        'aria-label',
        'Resume',
    )
    await attachScreenshot(page, testInfo, 'crash-recovery-restored-paused')

    await page.getByTestId('upup-upload-pause-toggle').click()
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'uploading',
    )
    await expect(page.getByTestId('upup-root')).toHaveAttribute(
        'data-state',
        'successful',
    )
    expect(multipart.initBodies.length).toBeGreaterThanOrEqual(2)
    expect(multipart.completeBodies).toHaveLength(1)
    await expect.poll(async () => readCrashRecoverySnapshot(page)).toBeNull()
    await attachScreenshot(page, testInfo, 'crash-recovery-resumed-success')
})
