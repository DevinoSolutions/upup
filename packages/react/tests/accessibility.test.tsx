import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { UpupUploader } from '../src/upup-uploader'

expect.extend(toHaveNoViolations)

describe('Accessibility', () => {
  it('UpupUploader has no axe violations', async () => {
    const { container } = render(
      <UpupUploader
        provider="aws"
        uploadEndpoint="/api/upload"
        sources={['local']}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
