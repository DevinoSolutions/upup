import React from 'react'
import { FaPlus } from 'react-icons/fa'
import type { Integration } from './types'

interface PlannedStripProps {
    planned: Integration[]
    onProviderClick: (provider: Integration, trigger: HTMLElement) => void
    onCustomRequest: (trigger: HTMLElement) => void
}

const PlannedStrip: React.FC<PlannedStripProps> = ({
    planned,
    onProviderClick,
    onCustomRequest,
}) => (
    <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            On the roadmap — click to request one
        </p>
        <div className="flex flex-wrap justify-center gap-2">
            {planned.map(provider => (
                <button
                    key={provider.id}
                    type="button"
                    onClick={e => onProviderClick(provider, e.currentTarget)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-black/10 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <provider.icon className="w-3.5 h-3.5" aria-hidden />
                    {provider.name}
                </button>
            ))}
            <button
                type="button"
                onClick={e => onCustomRequest(e.currentTarget)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-black/10 dark:hover:border-white/20 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <FaPlus className="w-3.5 h-3.5" />
                Request Custom
            </button>
        </div>
    </div>
)

export default PlannedStrip
