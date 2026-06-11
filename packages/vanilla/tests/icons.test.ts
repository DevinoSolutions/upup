import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'lit-html'
import { UploadIcon, XIcon, GoogleDriveIcon, LinkIcon } from '../src/templates/icons'

beforeEach(() => { document.body.innerHTML = '' })

describe('icons', () => {
  it('renders parametrized icons with size + class and brand icons zero-arg', () => {
    const host = document.createElement('div'); document.body.appendChild(host)
    render(UploadIcon({ size: 32, class: 'upup-test' }), host)
    const up = host.querySelector('svg')
    expect(up).toBeTruthy()
    expect(up!.getAttribute('width')).toBe('32')
    expect(up!.getAttribute('class')).toContain('upup-test')

    render(XIcon(), host)
    expect(host.querySelector('svg')).toBeTruthy()

    render(GoogleDriveIcon(), host)
    expect(host.querySelector('svg')).toBeTruthy()

    render(LinkIcon(), host)
    expect(host.querySelector('svg path')).toBeTruthy()
  })
})
