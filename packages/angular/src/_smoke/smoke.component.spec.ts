import { TestBed } from '@angular/core/testing'
import { SmokeComponent } from './smoke.component'

it('renders via TestBed', () => {
  const fixture = TestBed.createComponent(SmokeComponent)
  fixture.detectChanges()
  expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="smoke"]')?.textContent).toBe('ok')
})
