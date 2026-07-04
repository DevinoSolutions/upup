import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

/**
 * Default file-delete glyph — renders the shared registry 'trash' icon (parity with
 * React's react-icons TbTrash default for icons.FileDeleteIcon).
 *
 * Rendered via NgComponentOutlet (no inputs passed), so the file-card delete-button
 * size (upup-h-3 upup-w-3, matching React's <FileDeleteIcon className="upup-h-3 upup-w-3" />)
 * is baked as the default class.
 */
@Component({
  selector: "upup-icon-trash",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="trash" [class]="className" />`,
})
export class TrashIconComponent {
  @Input("class") className: string = "upup-h-3 upup-w-3";
}
