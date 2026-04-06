import { describe, it, expect } from 'vitest'
import { bytesToSize, sizeToBytes, checkFileSize } from '../src/lib/file'

describe('bytesToSize', () => {
  it('returns "0 Byte" for 0', () => {
    expect(bytesToSize(0)).toBe('0 Byte')
  })

  it('converts bytes', () => {
    expect(bytesToSize(500)).toBe('500 Bytes')
  })

  it('converts KB', () => {
    expect(bytesToSize(1024)).toBe('1 KB')
  })

  it('converts MB', () => {
    expect(bytesToSize(1048576)).toBe('1 MB')
  })

  it('converts GB', () => {
    expect(bytesToSize(1073741824)).toBe('1 GB')
  })

  it('rounds to nearest unit', () => {
    expect(bytesToSize(1536)).toBe('2 KB') // 1.5 KB rounds to 2
  })
})

describe('sizeToBytes', () => {
  it('returns bytes as-is for B unit', () => {
    expect(sizeToBytes(100, 'B')).toBe(100)
  })

  it('converts KB to bytes', () => {
    expect(sizeToBytes(1, 'KB')).toBe(1024)
  })

  it('converts MB to bytes', () => {
    expect(sizeToBytes(1, 'MB')).toBe(1048576)
  })

  it('converts GB to bytes', () => {
    expect(sizeToBytes(1, 'GB')).toBe(1073741824)
  })

  it('converts TB to bytes', () => {
    expect(sizeToBytes(1, 'TB')).toBe(1099511627776)
  })

  it('handles fractional sizes', () => {
    expect(sizeToBytes(0.5, 'MB')).toBe(524288)
  })

  it('defaults to B when no unit', () => {
    expect(sizeToBytes(42)).toBe(42)
  })
})

describe('checkFileSize', () => {
  it('passes when file is within max limit', () => {
    const file = new File(['x'.repeat(500)], 'small.txt')
    expect(checkFileSize(file, { size: 1, unit: 'KB' })).toBe(true)
  })

  it('fails when file exceeds max limit', () => {
    const file = new File(['x'.repeat(2000)], 'big.txt')
    expect(checkFileSize(file, { size: 1, unit: 'KB' })).toBe(false)
  })

  it('passes when file equals max limit exactly', () => {
    const content = 'x'.repeat(1024)
    const file = new File([content], 'exact.txt')
    expect(checkFileSize(file, { size: file.size, unit: 'B' })).toBe(true)
  })

  it('passes min check when file meets minimum', () => {
    const file = new File(['x'.repeat(2000)], 'big.txt')
    expect(checkFileSize(file, { size: 1, unit: 'KB' }, 'min')).toBe(true)
  })

  it('fails min check when file is too small', () => {
    const file = new File(['x'.repeat(100)], 'tiny.txt')
    expect(checkFileSize(file, { size: 1, unit: 'KB' }, 'min')).toBe(false)
  })

  it('uses MB units correctly', () => {
    const file = new File(['x'.repeat(500000)], 'medium.txt')
    expect(checkFileSize(file, { size: 1, unit: 'MB' })).toBe(true)
    expect(checkFileSize(file, { size: 1, unit: 'MB' }, 'min')).toBe(false)
  })
})
