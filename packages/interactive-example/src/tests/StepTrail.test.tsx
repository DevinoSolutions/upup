import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepTrail } from '../ai/StepTrail'
import type { ChatStep } from '../ai/chatSteps'

const STEPS: ChatStep[] = [
    {
        id: 'a',
        tool: 'search-docs',
        status: 'done',
        label: 'Searched the docs',
    },
    {
        id: 'b',
        tool: 'apply-config-patch',
        status: 'running',
        label: 'Updating the uploader config: maxFiles',
    },
]

const toggle = () => screen.getByRole('button')
const list = (container: HTMLElement) =>
    container.querySelector('ol') as HTMLOListElement

describe('StepTrail', () => {
    it('is collapsed by default and wires the button to its list', () => {
        const { container } = render(
            <StepTrail steps={[STEPS[0]!, STEPS[1]!]} pending={false} />,
        )
        const button = toggle()
        const steps = list(container)

        expect(button.tagName).toBe('BUTTON')
        expect(button.getAttribute('type')).toBe('button')
        expect(button.getAttribute('aria-expanded')).toBe('false')
        expect(button.textContent).toBe('Show steps (2)')
        // The list stays in the DOM so aria-controls always resolves.
        expect(steps.id).toBeTruthy()
        expect(button.getAttribute('aria-controls')).toBe(steps.id)
        expect(steps.hidden).toBe(true)
        expect(steps.querySelectorAll('li')).toHaveLength(2)
    })

    it('opens and closes with a click', async () => {
        const user = userEvent.setup()
        const { container } = render(
            <StepTrail steps={STEPS} pending={false} />,
        )

        await user.click(toggle())
        expect(toggle().getAttribute('aria-expanded')).toBe('true')
        expect(toggle().textContent).toBe('Hide steps')
        expect(list(container).hidden).toBe(false)
        expect(
            [...container.querySelectorAll('li')].map(li => li.textContent),
        ).toEqual([
            'Searched the docs',
            'Updating the uploader config: maxFiles',
        ])

        await user.click(toggle())
        expect(toggle().getAttribute('aria-expanded')).toBe('false')
        expect(list(container).hidden).toBe(true)
    })

    it('toggles from the keyboard with Enter and with Space', async () => {
        const user = userEvent.setup()
        const { container } = render(
            <StepTrail steps={STEPS} pending={false} />,
        )

        await user.tab()
        expect(document.activeElement).toBe(toggle())

        await user.keyboard('{Enter}')
        expect(toggle().getAttribute('aria-expanded')).toBe('true')
        expect(list(container).hidden).toBe(false)
        // Focus stays on the button through the toggle.
        expect(document.activeElement).toBe(toggle())

        await user.keyboard(' ')
        expect(toggle().getAttribute('aria-expanded')).toBe('false')
        expect(list(container).hidden).toBe(true)

        await user.keyboard('[Space]')
        expect(toggle().getAttribute('aria-expanded')).toBe('true')
    })

    it('shows the latest running step in the collapsed label while streaming', () => {
        const { rerender } = render(<StepTrail steps={STEPS} pending />)
        expect(toggle().textContent).toBe(
            'Updating the uploader config: maxFiles…',
        )
        expect(toggle().getAttribute('aria-expanded')).toBe('false')

        // Once the latest step has settled the label goes back to the count.
        rerender(
            <StepTrail
                steps={[STEPS[0]!, { ...STEPS[1]!, status: 'done' }]}
                pending
            />,
        )
        expect(toggle().textContent).toBe('Show steps (2)')
    })

    it('keeps its open state when new steps stream in', async () => {
        const user = userEvent.setup()
        const { rerender, container } = render(
            <StepTrail steps={[STEPS[0]!]} pending />,
        )
        await user.click(toggle())
        rerender(<StepTrail steps={STEPS} pending />)
        expect(toggle().getAttribute('aria-expanded')).toBe('true')
        expect(list(container).querySelectorAll('li')).toHaveLength(2)
    })

    it('stays quiet while streaming and announces once when the turn ends', () => {
        const { container, rerender } = render(
            <StepTrail steps={[STEPS[0]!]} pending />,
        )
        const status = container.querySelector('[role="status"]')!
        // Steps themselves are never a live region.
        expect(list(container).closest('[aria-live]')).toBeNull()
        expect(status.textContent).toBe('')

        rerender(<StepTrail steps={STEPS} pending />)
        expect(status.textContent).toBe('')

        rerender(<StepTrail steps={STEPS} pending={false} />)
        // Same node: the region existed before its text changed.
        expect(container.querySelector('[role="status"]')).toBe(status)
        expect(status.getAttribute('aria-live')).toBe('polite')
        expect(status.textContent).toBe('Finished 2 steps.')
    })

    it('counts failed steps in the closing announcement', () => {
        const { container } = render(
            <StepTrail
                steps={[
                    {
                        id: 'a',
                        tool: 'apply-config-patch',
                        status: 'error',
                        label: 'That change failed',
                    },
                ]}
                pending={false}
            />,
        )
        expect(container.querySelector('[role="status"]')?.textContent).toBe(
            'Finished 1 step, 1 failed.',
        )
    })

    it('renders nothing without steps', () => {
        const { container } = render(<StepTrail steps={[]} pending />)
        expect(container.firstChild).toBeNull()
    })

    it('gives each trail its own list id', () => {
        const { container } = render(
            <>
                <StepTrail steps={STEPS} pending={false} />
                <StepTrail steps={STEPS} pending={false} />
            </>,
        )
        const ids = [...container.querySelectorAll('ol')].map(o => o.id)
        expect(new Set(ids).size).toBe(2)
    })
})
