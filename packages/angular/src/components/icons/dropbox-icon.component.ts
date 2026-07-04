import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-dropbox-icon",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="dropbox" [class]="className" />`,
})
export class DropboxIconComponent {
  @Input("class") className = "";
}
