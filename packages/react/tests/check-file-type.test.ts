import { describe, it, expect } from 'vitest'
import checkFileType from '../src/shared/lib/checkFileType'

describe('checkFileType', () => {
  // MIME type matching
  it('accepts exact MIME type match', () => {
    const file = new File([''], 'doc.pdf', { type: 'application/pdf' })
    expect(checkFileType('application/pdf', file)).toBe(true)
  })

  it('accepts wildcard MIME type (image/*)', () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    expect(checkFileType('image/*', file)).toBe(true)
  })

  it('accepts wildcard MIME type (video/*)', () => {
    const file = new File([''], 'clip.mp4', { type: 'video/mp4' })
    expect(checkFileType('video/*', file)).toBe(true)
  })

  it('rejects wrong MIME type', () => {
    const file = new File([''], 'script.js', { type: 'application/javascript' })
    expect(checkFileType('image/*', file)).toBe(false)
  })

  it('accepts * wildcard (all types)', () => {
    const file = new File([''], 'anything.xyz', { type: 'application/octet-stream' })
    expect(checkFileType('*', file)).toBe(true)
  })

  it('is case-insensitive for MIME types', () => {
    const file = new File([''], 'doc.pdf', { type: 'Application/PDF' })
    expect(checkFileType('application/pdf', file)).toBe(true)
  })

  // Extension matching
  it('accepts file extension match', () => {
    const file = new File([''], 'data.csv', { type: '' })
    expect(checkFileType('.csv', file)).toBe(true)
  })

  it('accepts case-insensitive extension', () => {
    const file = new File([''], 'photo.JPG', { type: '' })
    expect(checkFileType('.jpg', file)).toBe(true)
  })

  it('rejects wrong extension', () => {
    const file = new File([''], 'data.txt', { type: '' })
    expect(checkFileType('.csv', file)).toBe(false)
  })

  // Multiple accept types
  it('accepts from comma-separated list (MIME)', () => {
    const file = new File([''], 'photo.png', { type: 'image/png' })
    expect(checkFileType('application/pdf, image/png', file)).toBe(true)
  })

  it('accepts from comma-separated list (extension)', () => {
    const file = new File([''], 'doc.docx', { type: '' })
    expect(checkFileType('.pdf,.doc,.docx', file)).toBe(true)
  })

  it('accepts mixed MIME and extension list', () => {
    const file = new File([''], 'photo.png', { type: 'image/png' })
    expect(checkFileType('.pdf, image/*, .doc', file)).toBe(true)
  })

  // Edge cases
  it('returns false for empty accept string', () => {
    const file = new File([''], 'test.txt', { type: 'text/plain' })
    expect(checkFileType('', file)).toBe(false)
  })

  it('falls back to extension when no MIME type', () => {
    const file = new File([''], 'archive.tar.gz', { type: '' })
    expect(checkFileType('.gz', file)).toBe(true)
  })

  it('rejects file with no matching type or extension', () => {
    const file = new File([''], 'unknown.xyz', { type: 'application/octet-stream' })
    expect(checkFileType('.pdf,.doc', file)).toBe(false)
  })
})
