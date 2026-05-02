import type { CategoryDefinition } from '../types'
import { Palette } from 'lucide-react'

export const appearanceCategory: CategoryDefinition = {
    tier: 'simple',
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme mode, tokens, and per-slot overrides',
    icon: Palette,
    entries: [
        {
            id: 'theme.mode',
            label: 'Theme mode',
            primitive: 'enum',
            defaultValue: 'system',
            options: { options: ['light', 'dark', 'system'], layout: 'segmented' },
        },
        {
            id: 'theme.tokens.color.primary',
            label: 'Primary color',
            primitive: 'color',
            defaultValue: '',
            options: { placeholder: '#30C5F7' },
        },
        {
            id: 'theme.slots',
            label: 'Slot overrides (className strings)',
            description: 'Target any internal element with custom classes — Tailwind utilities or plain CSS names. Pick a preset for a working starting point, or type your own. See the Theming guide for the full slot map.',
            primitive: 'nested',
            defaultValue: undefined,
            options: {
                fields: [
                    {
                        id: 'uploader.container',
                        label: 'uploader.container',
                        description: 'Outermost wrapper around the entire uploader tree.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'rounded-2xl border shadow-lg',
                            presets: [
                                { label: 'Soft card', value: 'rounded-2xl shadow-md border' },
                                { label: 'Glassy panel', value: 'bg-white/30 backdrop-blur-md rounded-2xl border border-white/20' },
                                { label: 'Sharp ring', value: 'ring-2 ring-slate-300 rounded-md' },
                            ],
                        },
                    },
                    {
                        id: 'fileList.root',
                        label: 'fileList.root',
                        description: 'The scrollable list shown after files are added.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'bg-slate-50 dark:bg-slate-900',
                            presets: [
                                { label: 'Tinted shelf', value: 'bg-slate-50 dark:bg-slate-900/50' },
                                { label: 'Plain', value: 'bg-transparent' },
                                { label: 'Subtle dividers', value: 'divide-y divide-slate-200' },
                            ],
                        },
                    },
                    {
                        id: 'fileList.uploadButton',
                        label: 'fileList.uploadButton',
                        description: 'Primary "Upload N files" button at the bottom of the list.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'bg-indigo-600 hover:bg-indigo-700 text-white',
                            presets: [
                                { label: 'Indigo', value: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                                { label: 'Emerald', value: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
                                { label: 'Slate ghost', value: 'bg-slate-100 hover:bg-slate-200 text-slate-900' },
                            ],
                        },
                    },
                    {
                        id: 'filePreview.deleteButton',
                        label: 'filePreview.deleteButton',
                        description: 'Per-file remove (X) button on the preview tile.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'opacity-60 hover:opacity-100',
                            presets: [
                                { label: 'Subtle', value: 'opacity-60 hover:opacity-100' },
                                { label: 'Bold red', value: 'bg-red-500 hover:bg-red-600 text-white rounded-full' },
                                { label: 'Mute outline', value: 'border border-slate-200 text-slate-400 hover:text-slate-700' },
                            ],
                        },
                    },
                    {
                        id: 'progressBar.fill',
                        label: 'progressBar.fill',
                        description: 'The filled part of the per-file progress bar.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'bg-gradient-to-r from-cyan-400 to-blue-500',
                            presets: [
                                { label: 'Cyan to blue', value: 'bg-gradient-to-r from-cyan-400 to-blue-500' },
                                { label: 'Solid emerald', value: 'bg-emerald-500' },
                                { label: 'Hot pink', value: 'bg-pink-500' },
                            ],
                        },
                    },
                    {
                        id: 'sourceSelector.adapterButton',
                        label: 'sourceSelector.adapterButton',
                        description: 'The row of source tiles (Device, Google Drive, Camera, …).',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'rounded-lg ring-1 ring-slate-200',
                            presets: [
                                { label: 'Soft ring', value: 'rounded-lg ring-1 ring-slate-200' },
                                { label: 'Bordered', value: 'rounded-md border border-slate-300' },
                                { label: 'Floating', value: 'rounded-xl shadow-sm' },
                            ],
                        },
                    },
                    {
                        id: 'sourceView.header',
                        label: 'sourceView.header',
                        description: 'Header strip shown while a drive/camera picker is open.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'border-b border-slate-200 px-4',
                            presets: [
                                { label: 'Bordered', value: 'border-b border-slate-200 px-4' },
                                { label: 'Tinted', value: 'bg-slate-50 px-4' },
                                { label: 'Bold', value: 'bg-slate-900 text-white px-4' },
                            ],
                        },
                    },
                    {
                        id: 'urlUploader.fetchButton',
                        label: 'urlUploader.fetchButton',
                        description: 'The fetch-URL action button inside the Link source.',
                        primitive: 'combo',
                        defaultValue: '',
                        options: {
                            placeholder: 'bg-slate-900 text-white',
                            presets: [
                                { label: 'Dark', value: 'bg-slate-900 hover:bg-slate-800 text-white' },
                                { label: 'Indigo', value: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
                                { label: 'Outline', value: 'border border-slate-300 hover:bg-slate-50' },
                            ],
                        },
                    },
                ],
            },
        },
        {
            id: 'className',
            label: 'Root className',
            description: 'Applied to the uploader\'s top-level container. Quick way to size / position the whole component without touching slots.',
            primitive: 'combo',
            defaultValue: '',
            options: {
                placeholder: 'max-w-2xl mx-auto',
                presets: [
                    { label: 'Centered', value: 'max-w-2xl mx-auto' },
                    { label: 'Full bleed', value: 'w-full' },
                    { label: 'Sidebar inset', value: 'max-w-xl ml-auto' },
                ],
            },
        },
    ],
}
