import { Component } from '@angular/core'
import { bootstrapApplication } from '@angular/platform-browser'

@Component({
  selector: 'upup-storybook-root',
  standalone: true,
  template: '',
})
class StorybookRootComponent {}

bootstrapApplication(StorybookRootComponent).catch((error: unknown) => {
  console.error(error)
})
