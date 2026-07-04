import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-user-icon",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="user" [class]="className" />`,
})
export class UserIconComponent {
  @Input("class") className: string = "";
}
