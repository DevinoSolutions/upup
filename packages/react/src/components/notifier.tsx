'use client'

import React from 'react'
import { TbX } from 'react-icons/tb'
import type { InformerMessage } from '../hooks/use-informer'
import { cn } from '../lib/tailwind'

type NotifierProps = {
    messages: InformerMessage[]
    onDismiss: (id: string) => void
}

export default function Notifier({ messages, onDismiss }: NotifierProps) {
    if (messages.length === 0) return null

    return (
        <div
            role="alert"
            aria-live="polite"
            className="upup-absolute upup-bottom-10 upup-left-2 upup-right-2 upup-z-50 upup-flex upup-flex-col upup-gap-1.5"
            data-upup-slot="notifier.root"
        >
            {messages.map(message => (
                <div
                    key={message.id}
                    className={cn(
                        'upup-flex upup-animate-informer-in upup-items-start upup-justify-between upup-gap-2 upup-rounded-lg upup-px-3 upup-py-2 upup-text-xs upup-shadow-lg upup-text-white',
                        {
                            'upup-bg-red-500': message.type === 'error',
                            'upup-bg-amber-400 upup-text-amber-900':
                                message.type === 'warning',
                            'upup-bg-blue-500': message.type === 'info',
                        },
                    )}
                    style={{
                        backgroundColor:
                            message.type === 'error'
                                ? 'var(--upup-color-danger)'
                                : message.type === 'info'
                                  ? 'var(--upup-color-primary)'
                                  : undefined,
                    }}
                    data-upup-slot="notifier.message"
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
