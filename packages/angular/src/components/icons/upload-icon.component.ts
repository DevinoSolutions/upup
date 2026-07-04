import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-icon-upload",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="upload" [size]="size" [class]="className" />`,
})
export class UploadIconComponent {
  @Input() size: number = 24;
  @Input("class") className: string = "";
}
