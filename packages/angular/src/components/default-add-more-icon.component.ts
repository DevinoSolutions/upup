import { Component, Input } from '@angular/core'
import { IconComponent } from './icon.component'

/**
 * Default 'add more' glyph — renders the shared registry 'plus' icon (parity
 * with React's DefaultPlusIconComponent / svelte's DefaultAddMoreIcon). This is
 * the store's default ContainerAddMoreIcon; healing F-711 (the angular header
 * previously defaulted to the empty icon, so no add-more SVG rendered).
 */
@Component({
    selector: 'upup-default-add-more-icon',
    standalone: true,
    imports: [IconComponent],
    template: `<upup-icon name="plus" [size]="size" />`,
})
export class DefaultAddMoreIconComponent {
    @Input() size?: number
}
