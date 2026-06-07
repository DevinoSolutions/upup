// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { render } from 'svelte/server'
import Hello from './fixtures/Hello.svelte'

describe('svelte/server render pipeline', () => {
  it('renders a component to an HTML body string on the server', () => {
    const { body } = render(Hello, { props: { name: 'upup' } })
    expect(body).toContain('hello upup')
    expect(body).toContain('upup-greeting')
  })
})
