import React from 'react'
import { TbX } from 'react-icons/tb'
import { InformerMessage } from '../hooks/useInformer'
import { cn } from '../lib/tailwind'

type InformerProps = {
    messages: InformerMessage[]
    onDismiss: (id: string) => void
    dark?: boolean
}

export default function Informer({ messages, onDismiss, dark }: InformerProps) {
    if (messages.length === 0) return null

    return (
        <div className="upup-absolute upup-bottom-10 upup-left-2 upup-right-2 upup-z-50 upup-flex upup-flex-col upup-gap-1.5">
            {messages.map(message => (
                <div
                    key={message.id}
                    role="alert"
                    aria-live="assertive"
                    className={cn(
                        'upup-flex upup-animate-informer-in upup-items-start upup-justify-between upup-gap-2 upup-rounded-lg upup-px-3 upup-py-2 upup-text-xs upup-shadow-lg',
                        dark
                            ? {
                                  'upup-bg-red-600 upup-text-white':
                                      message.type === 'error',
                                  'upup-bg-amber-500 upup-text-amber-100':
                                      message.type === 'warning',
                                  'upup-bg-blue-600 upup-text-white':
                                      message.type === 'info',
                              }
                            : {
                                  'upup-bg-red-500 upup-text-white':
                                      message.type === 'error',
                                  'upup-bg-amber-400 upup-text-amber-900':
                                      message.type === 'warning',
                                  'upup-bg-blue-500 upup-text-white':
                                      message.type === 'info',
                              },
                    )}
                >
                    <span className="upup-leading-4">{message.text}</span>
                    <button
                        type="button"
                        onClick={() => onDismiss(message.id)}
                        className="upup-mt-0.5 upup-shrink-0 upup-rounded upup-opacity-80 hover:upup-opacity-100 focus:upup-outline-none"
                        aria-label="Dismiss"
                    >
                        <TbX size={13} />
                    </button>
                </div>
            ))}
        </div>
    )
}
