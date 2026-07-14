import { describe, it, expect, beforeEach } from 'vitest'
import { render } from 'lit-html'
import { icon } from '../src/templates/icon'

beforeEach(() => {
    document.body.innerHTML = ''
})

describe('icons', () => {
    it('renders registry icons with size + class, brand, and baked-color icons', () => {
        const host = document.createElement('div')
        document.body.appendChild(host)
        render(icon('upload', { size: 32, class: 'upup-test' }), host)
        const up = host.querySelector('svg')
        expect(up).toBeTruthy()
        expect(up!.getAttribute('width')).toBe('32')
        expect(up!.getAttribute('class')).toContain('upup-test')

        render(icon('x'), host)
        expect(host.querySelector('svg')).toBeTruthy()

        render(icon('google-drive'), host)
        expect(host.querySelector('svg')).toBeTruthy()

        render(icon('link'), host)
        expect(host.querySelector('svg path')).toBeTruthy()
    })
})
