import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from '../state/ConfigContext'
import { AssistantPanel } from '../ai/AssistantPanel'
import type { ChatMessage } from '../ai/useMastraChat'
import type { AiFeedbackEvent } from '../types'

// Drive the panel off controlled messages — no MastraClient / network. The
// holder is hoisted so the vi.mock factory can read it.
const hook = vi.hoisted(() => ({
    messages: [] as ChatMessage[],
    conversationId: 'conv-1' as string | null,
}))

vi.mock('../ai/useMastraChat', () => ({
    useMastraChat: () => ({
        messages: hook.messages,
        isStreaming: false,
        error: null,
        conversationId: hook.conversationId,
        send: () => {},
        cancel: () => {},
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
    render(
        <ConfigProvider>
            <AssistantPanel
                agentId="playground-agent"
                appId="upup-landing"
                onAiFeedback={onAiFeedback}
            />
        </ConfigProvider>,
    )
    return { onAiFeedback }
}

beforeEach(() => {
    hook.messages = []
    hook.conversationId = 'conv-1'
    vi.clearAllMocks()
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
