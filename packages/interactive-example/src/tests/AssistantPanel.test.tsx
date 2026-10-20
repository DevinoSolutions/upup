import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from '../state/ConfigContext'
import { AssistantPanel } from '../ai/AssistantPanel'
import { PROMPT_SEEDS } from '../ai/promptSeeds'
import type { ChatMessage } from '../ai/useMastraChat'
import type { AiFeedbackEvent } from '../types'

// Drive the panel off controlled messages — no MastraClient / network. The
// holder is hoisted so the vi.mock factory can read it.
const hook = vi.hoisted(() => ({
    messages: [] as ChatMessage[],
    conversationId: 'conv-1' as string | null,
    isPending: false,
    sent: [] as string[],
}))

vi.mock('../ai/useMastraChat', () => ({
    useMastraChat: () => ({
        messages: hook.messages,
        isPending: hook.isPending,
        error: null,
        conversationId: hook.conversationId,
        // Like the real hook, a send starts a turn that is pending until
        // the stream ends; the panel's own re-render picks the flag up.
        send: (text: string) => {
            hook.sent.push(text)
            hook.isPending = true
        },
        reset: () => {},
    }),
}))

const TRACE_ID = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'

function asstMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'm-1',
        role: 'assistant',
        text: 'Here you go.',
        pending: false,
        traceId: TRACE_ID,
        ...overrides,
    }
}

/** An assistant turn with NO trace id (property absent, not `undefined`). */
function asstMsgNoTrace(
    overrides: Omit<Partial<ChatMessage>, 'traceId'> = {},
): ChatMessage {
    return {
        id: 'm-1',
        role: 'assistant',
        text: 'Here you go.',
        pending: false,
        ...overrides,
    }
}

/** Read a captured feedback event, asserting the call happened. */
function eventAt(
    fn: { mock: { calls: Array<[AiFeedbackEvent]> } },
    i: number,
): AiFeedbackEvent {
    const call = fn.mock.calls[i]
    if (!call) throw new Error(`expected onAiFeedback call #${i}`)
    return call[0]
}

function renderPanel(messages: ChatMessage[]) {
    hook.messages = messages
    const onAiFeedback = vi.fn<(event: AiFeedbackEvent) => void>()
    const panel = () => (
        <ConfigProvider>
            <AssistantPanel
                agentId="playground-agent"
                appId="upup-landing"
                onAiFeedback={onAiFeedback}
            />
        </ConfigProvider>
    )
    const { rerender } = render(panel())
    return { onAiFeedback, rerenderPanel: () => rerender(panel()) }
}

beforeEach(() => {
    hook.messages = []
    hook.conversationId = 'conv-1'
    hook.isPending = false
    hook.sent = []
    vi.clearAllMocks()
})

describe('AssistantPanel composer', () => {
    it('keeps keyboard focus in the composer while the answer streams', async () => {
        const user = userEvent.setup()
        renderPanel([])
        const box = screen.getByLabelText('Message') as HTMLTextAreaElement

        await user.click(box)
        await user.keyboard('make it dark{Enter}')

        expect(hook.sent).toEqual(['make it dark'])
        expect(hook.isPending).toBe(true)
        // Disabling the focused textarea would drop focus to <body>.
        expect(box.disabled).toBe(false)
        expect(box.readOnly).toBe(true)
        expect(box.getAttribute('aria-disabled')).toBe('true')
        expect(document.activeElement).toBe(box)
        expect(
            screen.getByLabelText('Send').getAttribute('aria-disabled'),
        ).toBe('true')
    })

    it('keeps keyboard focus on Send while the answer streams', async () => {
        const user = userEvent.setup()
        renderPanel([])
        const box = screen.getByLabelText('Message') as HTMLTextAreaElement
        const sendBtn = screen.getByLabelText('Send') as HTMLButtonElement

        await user.click(box)
        await user.keyboard('make it dark')
        await user.tab()
        expect(document.activeElement).toBe(sendBtn)
        await user.keyboard('{Enter}')

        expect(hook.sent).toEqual(['make it dark'])
        expect(hook.isPending).toBe(true)
        // Disabling the focused button would drop focus to <body>.
        expect(sendBtn.disabled).toBe(false)
        expect(sendBtn.getAttribute('aria-disabled')).toBe('true')
        expect(document.activeElement).toBe(sendBtn)

        // Activating it again mid-stream sends nothing.
        await user.keyboard('{Enter}')
        await user.keyboard(' ')
        await user.click(sendBtn)
        expect(hook.sent).toEqual(['make it dark'])
        expect(document.activeElement).toBe(sendBtn)
    })

    it('keeps focus on an inert Send while the composer is empty', async () => {
        const user = userEvent.setup()
        renderPanel([])
        const sendBtn = screen.getByLabelText('Send') as HTMLButtonElement

        expect(sendBtn.disabled).toBe(false)
        expect(sendBtn.getAttribute('aria-disabled')).toBe('true')
        sendBtn.focus()
        await user.keyboard('{Enter}')
        await user.click(sendBtn)

        expect(hook.sent).toEqual([])
        expect(document.activeElement).toBe(sendBtn)
    })

    it('sends nothing from Enter, submit or a seed while a turn is pending', async () => {
        const user = userEvent.setup()
        const [seed] = PROMPT_SEEDS
        if (!seed) throw new Error('expected a prompt seed')
        const { rerenderPanel } = renderPanel([])
        const box = screen.getByLabelText('Message') as HTMLTextAreaElement
        await user.click(box)
        await user.keyboard('again')

        hook.isPending = true
        rerenderPanel()
        await user.keyboard('{Enter}')
        fireEvent.submit(box.form!)
        await user.click(screen.getByRole('button', { name: seed }))

        expect(hook.sent).toEqual([])
        // The draft survives the refused send.
        expect(box.value).toBe('again')
    })
})

describe('AssistantPanel thumbs feedback', () => {
    it('captures a rating once with the full correlation payload', async () => {
        const user = userEvent.setup()
        const { onAiFeedback } = renderPanel([asstMsg()])

        await user.click(screen.getByLabelText('Good response'))

        expect(onAiFeedback).toHaveBeenCalledTimes(1)
        const event = eventAt(onAiFeedback, 0)
        expect(event.name).toBe('ai_response_rated')
        expect(event.properties).toMatchObject({
            $ai_trace_id: TRACE_ID,
            $ai_session_id: 'conv-1',
            feedback_source: 'ai_response',
            message_id: 'm-1',
            app_id: 'upup-landing',
            agent_id: 'playground-agent',
            model: 'anthropic/claude-haiku-4.5',
            rating: 'up',
        })
        // feedback_id is a fresh id, not empty/fake.
        expect(event.properties.feedback_id).toMatch(/[0-9a-f-]{8,}/i)
    })

    it('ignores a second rating click (locked after first)', async () => {
        const user = userEvent.setup()
        const { onAiFeedback } = renderPanel([asstMsg()])

        await user.click(screen.getByLabelText('Good response'))
        await user.click(screen.getByLabelText('Good response'))
        await user.click(screen.getByLabelText('Bad response')) // switch not allowed

        expect(onAiFeedback).toHaveBeenCalledTimes(1)
    })

    it('opens the optional comment field on thumbs-down', async () => {
        const user = userEvent.setup()
        renderPanel([asstMsg()])

        expect(
            screen.queryByLabelText('What could have been better?'),
        ).toBeNull()
        await user.click(screen.getByLabelText('Bad response'))
        expect(
            screen.getByLabelText('What could have been better?'),
        ).toBeTruthy()
    })

    it('dismiss preserves the rating and fires nothing more', async () => {
        const user = userEvent.setup()
        const { onAiFeedback } = renderPanel([asstMsg()])

        await user.click(screen.getByLabelText('Bad response'))
        expect(onAiFeedback).toHaveBeenCalledTimes(1)

        await user.click(screen.getByLabelText('Dismiss'))

        // Field gone, no extra event, rating still selected.
        expect(
            screen.queryByLabelText('What could have been better?'),
        ).toBeNull()
        expect(onAiFeedback).toHaveBeenCalledTimes(1)
        expect(
            screen.getByLabelText('Bad response').getAttribute('aria-pressed'),
        ).toBe('true')
    })

    it('comment submit reuses the rating feedback_id and is once-only', async () => {
        const user = userEvent.setup()
        const { onAiFeedback } = renderPanel([asstMsg()])

        await user.click(screen.getByLabelText('Bad response'))
        const ratingId = eventAt(onAiFeedback, 0).properties.feedback_id

        await user.type(
            screen.getByLabelText('What could have been better?'),
            'The theme was wrong.',
        )
        await user.click(screen.getByRole('button', { name: 'Submit' }))

        expect(onAiFeedback).toHaveBeenCalledTimes(2)
        const commentEvent = eventAt(onAiFeedback, 1)
        expect(commentEvent.name).toBe('ai_response_feedback_comment')
        expect(commentEvent.properties.feedback_id).toBe(ratingId)
        expect(commentEvent.properties.comment).toBe('The theme was wrong.')
        expect(commentEvent.properties.$ai_trace_id).toBe(TRACE_ID)

        // Field is gone after submit — no second comment possible.
        expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull()
        expect(onAiFeedback).toHaveBeenCalledTimes(2)
    })

    it('omits $ai_trace_id when the message has no trace id (never faked)', async () => {
        const user = userEvent.setup()
        const { onAiFeedback } = renderPanel([asstMsgNoTrace()])

        await user.click(screen.getByLabelText('Good response'))

        const props = eventAt(onAiFeedback, 0).properties
        expect('$ai_trace_id' in props).toBe(false)
        expect(props.$ai_session_id).toBe('conv-1')
    })

    it('shows no thumbs on a pending assistant turn', () => {
        renderPanel([asstMsgNoTrace({ pending: true })])
        expect(screen.queryByLabelText('Good response')).toBeNull()
        expect(screen.queryByLabelText('Bad response')).toBeNull()
    })

    it('shows no thumbs on an error assistant turn', () => {
        renderPanel([asstMsgNoTrace({ error: true, text: 'unavailable' })])
        expect(screen.queryByLabelText('Good response')).toBeNull()
    })

    it('renders thumbs only for completed assistant messages, not user turns', () => {
        renderPanel([
            { id: 'u-1', role: 'user', text: 'make it dark' },
            asstMsg({ id: 'm-2' }),
        ])
        // Exactly one thumbs-up (the assistant turn).
        expect(screen.getAllByLabelText('Good response')).toHaveLength(1)
    })
})
