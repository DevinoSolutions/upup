import { describe, it, expect } from 'vitest'
import {
    progressBarRecipe,
    fileListRecipe,
    filePreviewRecipe,
    sourceSelectorRecipe,
    uploaderPanelRecipe,
    sourceViewRecipe,
    urlUploaderRecipe,
    driveBrowserRecipe,
    cameraUploaderRecipe,
    fileItemRecipe,
} from '../src/recipes'

describe('progressBarRecipe', () => {
    it('generates base slot classes', () => {
        const slots = progressBarRecipe()
        expect(slots.root()).toContain('upup-flex')
        expect(slots.root()).toContain('upup-items-center')
        expect(slots.track()).toContain('upup-bg-[#F5F5F5]')
        expect(slots.fill()).toContain('upup-bg-[#8EA5E7]')
        expect(slots.text()).toContain('upup-text-xs')
    })

    it('applies dark variant to text slot', () => {
        const slots = progressBarRecipe({ dark: true })
        expect(slots.text()).toContain('upup-text-white')
    })

    it('text slot does not include upup-text-white in light mode', () => {
        const slots = progressBarRecipe({ dark: false })
        expect(slots.text()).not.toContain('upup-text-white')
    })
})

describe('fileListRecipe', () => {
    it('generates base slot classes', () => {
        const slots = fileListRecipe()
        expect(slots.root()).toContain('upup-rounded-lg')
        expect(slots.scroll()).toContain('upup-overflow-y-auto')
        expect(slots.footer()).toContain('upup-rounded-b-lg')
        expect(slots.uploadButton()).toContain('upup-bg-blue-600')
        expect(slots.doneButton()).toContain('upup-rounded-lg')
    })

    it('applies dark variant', () => {
        const slots = fileListRecipe({ dark: true })
        expect(slots.scroll()).toContain('upup-bg-white/10')
        expect(slots.uploadButton()).toContain('upup-bg-[#30C5F7]')
    })
})

describe('filePreviewRecipe', () => {
    it('generates all slot classes', () => {
        const slots = filePreviewRecipe()
        expect(slots.root()).toContain('upup-inline-block')
        expect(slots.thumbnail()).toContain('upup-h-[145px]')
        expect(slots.deleteButton()).toContain('upup-text-red-600')
        expect(slots.editButton()).toContain('upup-text-blue-600')
        expect(slots.fileName()).toContain('upup-truncate')
        expect(slots.fileSize()).toContain('upup-text-gray-400')
        expect(slots.previewLink()).toContain('upup-text-[#4A9EFF]')
    })
})

describe('sourceSelectorRecipe', () => {
    it('generates base slot classes', () => {
        const slots = sourceSelectorRecipe()
        expect(slots.root()).toContain('upup-h-full')
        expect(slots.adapterButton()).toContain('upup-border-gray-200')
        expect(slots.adapterButtonText()).toContain('upup-text-[#242634]')
        expect(slots.browseButton()).toContain('upup-text-[#0E2ADD]')
    })

    it('applies dark variant', () => {
        const slots = sourceSelectorRecipe({ dark: true })
        expect(slots.adapterButtonText()).toContain('upup-text-gray-300')
        expect(slots.browseButton()).toContain('upup-text-[#59D1F9]')
    })
})

describe('uploaderPanelRecipe', () => {
    it('generates base slot classes', () => {
        const slots = uploaderPanelRecipe()
        expect(slots.root()).toContain('upup-rounded-lg')
        expect(slots.offlineBanner()).toContain('upup-bg-yellow-500')
    })

    it('adds border when hasBorder=true', () => {
        const slots = uploaderPanelRecipe({ hasBorder: true })
        expect(slots.root()).toContain('upup-border')
        expect(slots.root()).toContain('upup-border-[#1849D6]')
    })

    it('adds dark border color via compoundVariant', () => {
        const slots = uploaderPanelRecipe({ hasBorder: true, dark: true })
        expect(slots.root()).toContain('upup-border-[#30C5F7]')
    })

    it('adds dashed border when not dragging', () => {
        const slots = uploaderPanelRecipe({ isDragging: false })
        expect(slots.root()).toContain('upup-border-dashed')
    })

    it('adds drag-over bg in light mode', () => {
        const slots = uploaderPanelRecipe({ isDraggingOver: true })
        expect(slots.root()).toContain('upup-bg-[#E7ECFC]')
    })

    it('adds drag-over bg in dark mode via compoundVariant', () => {
        const slots = uploaderPanelRecipe({ isDraggingOver: true, dark: true })
        expect(slots.root()).toContain('upup-bg-[#045671]')
    })
})

describe('sourceViewRecipe', () => {
    it('generates base slot classes', () => {
        const slots = sourceViewRecipe()
        expect(slots.root()).toContain('upup-grid-rows-[auto,1fr]')
        expect(slots.header()).toContain('upup-text-[#1b5dab]')
        expect(slots.cancelButton()).toContain('upup-text-blue-600')
    })

    it('applies dark variant', () => {
        const slots = sourceViewRecipe({ dark: true })
        expect(slots.header()).toContain('upup-text-[#FAFAFA]')
        expect(slots.cancelButton()).toContain('upup-text-[#30C5F7]')
    })
})

describe('urlUploaderRecipe', () => {
    it('generates base slot classes', () => {
        const slots = urlUploaderRecipe()
        expect(slots.form()).toContain('upup-px-3')
        expect(slots.input()).toContain('upup-border-[#e0e0e0]')
        expect(slots.fetchButton()).toContain('upup-bg-blue-600')
    })

    it('applies dark variant', () => {
        const slots = urlUploaderRecipe({ dark: true })
        expect(slots.input()).toContain('upup-border-[#6D6D6D]')
        expect(slots.fetchButton()).toContain('upup-bg-[#59D1F9]')
    })
})

describe('driveBrowserRecipe', () => {
    it('generates base slot classes', () => {
        const slots = driveBrowserRecipe()
        expect(slots.root()).toContain('upup-grid-rows-[auto,1fr,auto]')
        expect(slots.body()).toContain('upup-overflow-y-scroll')
        expect(slots.footer()).toContain('upup-justify-start')
        expect(slots.addButton()).toContain('upup-bg-blue-600')
        expect(slots.cancelButton()).toContain('upup-text-blue-600')
    })

    it('applies dark variant', () => {
        const slots = driveBrowserRecipe({ dark: true })
        expect(slots.body()).toContain('upup-bg-white/10')
        expect(slots.addButton()).toContain('upup-bg-[#30C5F7]')
        expect(slots.cancelButton()).toContain('upup-text-[#30C5F7]')
    })
})

describe('cameraUploaderRecipe', () => {
    it('generates base slot classes', () => {
        const slots = cameraUploaderRecipe()
        expect(slots.root()).toContain('upup-justify-center')
        expect(slots.previewContainer()).toContain('upup-aspect-video')
        expect(slots.captureButton()).toContain('upup-bg-blue-600')
        expect(slots.rotateButton()).toContain('upup-bg-gray-500')
        expect(slots.addButton()).toContain('upup-bg-blue-600')
    })

    it('applies dark variant', () => {
        const slots = cameraUploaderRecipe({ dark: true })
        expect(slots.captureButton()).toContain('upup-bg-[#59D1F9]')
        expect(slots.addButton()).toContain('upup-bg-[#59D1F9]')
    })
})

describe('fileItemRecipe', () => {
    it('generates base slot classes', () => {
        const slots = fileItemRecipe()
        expect(slots.root()).toContain('upup-flex-col')
        expect(slots.root()).toContain('upup-bg-transparent')
    })
})
