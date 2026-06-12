import { render, screen, cleanup } from '@testing-library/preact'
import { afterEach, expect, test } from 'vitest'
import { UpupUploader } from '../index'

afterEach(cleanup)

test('UpupUploader renders the root shell on Preact via compat', () => {
  render(<UpupUploader />)
  expect(screen.getByTestId('upup-root')).toBeTruthy()
})

test('package re-exports the headless hook and enums', async () => {
  const mod = await import('../index')
  expect(typeof mod.useUpupUpload).toBe('function')
  expect(mod.FileSource).toBeTruthy()
})
