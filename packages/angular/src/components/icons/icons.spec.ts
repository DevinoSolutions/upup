import { describe, it, expect } from 'vitest'
import { TestBed } from '@angular/core/testing'
import { Component } from '@angular/core'
import { UploadIconComponent } from './upload-icon.component'
import { GoogleDriveIconComponent } from './google-drive-icon.component'
import { EmptyIconComponent } from './empty-icon.component'
import { XIconComponent } from './x-icon.component'
import { LayoutGridIconComponent } from './layout-grid-icon.component'
import { LayoutListIconComponent } from './layout-list-icon.component'

// ── UploadIconComponent ──────────────────────────────────────────────────────

describe('UploadIconComponent', () => {
    it('renders an <svg> element', async () => {
        await TestBed.configureTestingModule({
            imports: [UploadIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(UploadIconComponent)
        fixture.detectChanges()
        const el: HTMLElement = fixture.nativeElement
        const svg = el.querySelector('svg')
        expect(svg).not.toBeNull()
    })

    it('reflects size input on the svg width/height attrs', async () => {
        await TestBed.configureTestingModule({
            imports: [UploadIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(UploadIconComponent)
        fixture.componentInstance.size = 48
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg') as SVGElement
        expect(svg.getAttribute('width')).toBe('48')
        expect(svg.getAttribute('height')).toBe('48')
    })
})

// ── GoogleDriveIconComponent ─────────────────────────────────────────────────

describe('GoogleDriveIconComponent', () => {
    it('renders an <svg> element', async () => {
        await TestBed.configureTestingModule({
            imports: [GoogleDriveIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(GoogleDriveIconComponent)
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg')
        expect(svg).not.toBeNull()
    })
})

// ── EmptyIconComponent ───────────────────────────────────────────────────────

describe('EmptyIconComponent', () => {
    it('produces no <svg> element (renders nothing)', async () => {
        await TestBed.configureTestingModule({
            imports: [EmptyIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(EmptyIconComponent)
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg')
        expect(svg).toBeNull()
    })

    it('has empty text content', async () => {
        await TestBed.configureTestingModule({
            imports: [EmptyIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(EmptyIconComponent)
        fixture.detectChanges()
        expect(fixture.nativeElement.innerHTML.trim()).toBe('')
    })
})

// ── XIconComponent — size input ──────────────────────────────────────────────

describe('XIconComponent', () => {
    it('renders an <svg> element', async () => {
        await TestBed.configureTestingModule({
            imports: [XIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(XIconComponent)
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg')
        expect(svg).not.toBeNull()
    })

    it('reflects size input', async () => {
        await TestBed.configureTestingModule({
            imports: [XIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(XIconComponent)
        fixture.componentInstance.size = 32
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg') as SVGElement
        expect(svg.getAttribute('width')).toBe('32')
        expect(svg.getAttribute('height')).toBe('32')
    })
})

// ── LayoutGridIconComponent — view-mode toggle path ──────────────────────────
// Validates that <upup-icon-layout-grid> (selector used in uploader-header.component.ts)
// actually renders an <svg>, catching any selector/template mismatch the build might miss.

describe('LayoutGridIconComponent', () => {
    it('renders an <svg> element', async () => {
        await TestBed.configureTestingModule({
            imports: [LayoutGridIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(LayoutGridIconComponent)
        fixture.detectChanges()
        const svg: SVGElement | null = fixture.nativeElement.querySelector('svg')
        expect(svg).not.toBeNull()
    })

    it('reflects size input on width/height attrs', async () => {
        await TestBed.configureTestingModule({
            imports: [LayoutGridIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(LayoutGridIconComponent)
        fixture.componentInstance.size = 16
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg') as SVGElement
        expect(svg.getAttribute('width')).toBe('16')
        expect(svg.getAttribute('height')).toBe('16')
    })
})

// ── LayoutListIconComponent — view-mode toggle path ──────────────────────────

describe('LayoutListIconComponent', () => {
    it('renders an <svg> element', async () => {
        await TestBed.configureTestingModule({
            imports: [LayoutListIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(LayoutListIconComponent)
        fixture.detectChanges()
        const svg: SVGElement | null = fixture.nativeElement.querySelector('svg')
        expect(svg).not.toBeNull()
    })

    it('reflects size input on width/height attrs', async () => {
        await TestBed.configureTestingModule({
            imports: [LayoutListIconComponent],
        }).compileComponents()

        const fixture = TestBed.createComponent(LayoutListIconComponent)
        fixture.componentInstance.size = 16
        fixture.detectChanges()
        const svg = fixture.nativeElement.querySelector('svg') as SVGElement
        expect(svg.getAttribute('width')).toBe('16')
        expect(svg.getAttribute('height')).toBe('16')
    })
})
