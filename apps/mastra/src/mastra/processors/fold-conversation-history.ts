import type { ProcessInputArgs, Processor } from '@mastra/core/processors'

type InputMessage = ProcessInputArgs['messages'][number]

/**
 * Folds a multi-turn conversation into ONE user message before the model
 * sees it (T-17623).
 *
 * The free model behind the Devino proxy (tier `haiku`, served by
 * nvidia/nemotron-3.5-lightning:free on 2026-11-14) breaks on a request that
 * carries an earlier assistant turn: a measured 3 in 12 such requests came
 * back as HTTP 200 with an error as the answer text
 * (`max_tokens must be at least 1, got -13107`, `Max turns (2) exceeded`,
 * `process_single_item_agent ... killed`), and the prod Ask AI thread showed
 * that error as its second answer. The same history sent as a single user
 * message went 12 for 12, as did a fresh one-question request. Sending an
 * explicit `max_tokens` did not help (the negative-budget error still came
 * back with 2048 set), so the request shape is the lever.
 *
 * A one-message conversation passes through untouched. Only text is carried
 * over: the client sends `{ role, content }` strings, and earlier tool calls
 * never reach this request.
 */
export class FoldConversationHistory implements Processor {
    readonly id = 'fold-conversation-history'

    processInput({ messages, messageList }: ProcessInputArgs) {
        const last = messages[messages.length - 1]
        if (messages.length < 2 || !last || last.role !== 'user')
            return messages

        const earlier = messages
            .slice(0, -1)
            .map(m => ({ speaker: speakerOf(m), text: textOf(m) }))
            .filter(turn => turn.text)
        if (earlier.length === 0) return messages

        const folded = [
            'Earlier in this conversation (context only; answer the new question below):',
            ...earlier.map(turn => `${turn.speaker}: ${turn.text}`),
            `New question: ${textOf(last)}`,
        ].join('\n\n')

        messageList.removeByIds(messages.slice(0, -1).map(m => m.id))
        last.content = {
            ...last.content,
            parts: [{ type: 'text', text: folded }],
            content: folded,
        }
        return messageList
    }
}

function speakerOf(message: InputMessage): string {
    return message.role === 'assistant' ? 'Assistant' : 'User'
}

function textOf(message: InputMessage): string {
    const parts = message.content.parts ?? []
    const text = parts
        .map(part => (part.type === 'text' ? part.text : ''))
        .join('')
        .trim()
    return text || (message.content.content ?? '').trim()
}
