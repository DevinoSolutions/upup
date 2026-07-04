import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-link-icon",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="link" [class]="className" />`,
})
export class LinkIconComponent {
  @Input("class") className = "";
}
