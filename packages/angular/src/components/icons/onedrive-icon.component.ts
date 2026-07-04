import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-onedrive-icon",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="one-drive" [class]="className" />`,
})
export class OneDriveIconComponent {
  @Input("class") className = "";
}
