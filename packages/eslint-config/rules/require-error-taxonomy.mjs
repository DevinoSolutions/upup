/**
 * upup/require-error-taxonomy — in @upupjs/core + @upupjs/server src:
 *  - `throw` must throw an Error-taxonomy instance (Upload*Error) or rethrow
 *  - wrapping inside a catch must pass `{ cause }` so stack chains survive to Sentry
 * Bare `new Error` loses the taxonomy `code` used for fingerprinting.
 */
export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'throw Upload*Error taxonomy instances; preserve `cause` when wrapping in catch',
        },
        messages: {
            bareError:
                'Throw an UploadError subclass (taxonomy carries the `code` Sentry fingerprints on), not bare Error.',
            nonError:
                'Throw Error instances only — thrown literals have no stack for Sentry.',
            droppedCause:
                'Wrapping inside catch must pass { cause: <caught> } so the original stack survives.',
        },
        schema: [],
    },
    create(context) {
        let catchParam = null
        const stack = []
        return {
            CatchClause(node) {
                stack.push(catchParam)
                catchParam =
                    node.param?.type === 'Identifier' ? node.param.name : null
            },
            'CatchClause:exit'() {
                catchParam = stack.pop() ?? null
            },
            ThrowStatement(node) {
                const a = node.argument
                if (a.type === 'Identifier') return // rethrow
                if (a.type !== 'NewExpression') {
                    context.report({ node, messageId: 'nonError' })
                    return
                }
                const callee =
                    a.callee.type === 'Identifier' ? a.callee.name : null
                if (
                    callee === 'Error' ||
                    callee === 'TypeError' ||
                    callee === 'RangeError'
                ) {
                    context.report({ node, messageId: 'bareError' })
                    return
                }
                if (catchParam) {
                    const opts = a.arguments[1]
                    const hasCause =
                        opts?.type === 'ObjectExpression' &&
                        opts.properties.some(
                            p =>
                                p.type === 'Property' &&
                                ((p.key.type === 'Identifier' &&
                                    p.key.name === 'cause') ||
                                    (p.key.type === 'Literal' &&
                                        p.key.value === 'cause')),
                        )
                    if (!hasCause)
                        context.report({ node, messageId: 'droppedCause' })
                }
            },
        }
    },
}
