import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-icon-layout-grid",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="layout-grid" [size]="size" />`,
})
export class LayoutGridIconComponent {
  @Input() size: number = 24;
}
