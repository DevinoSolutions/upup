import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-screen-capture-icon",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="screen-capture" [class]="className" />`,
})
export class ScreenCaptureIconComponent {
  @Input("class") className = "";
}
