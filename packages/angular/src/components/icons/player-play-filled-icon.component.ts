import { Component, Input } from "@angular/core";
import { IconComponent } from "../icon.component";

@Component({
  selector: "upup-player-play-filled-icon",
  standalone: true,
  imports: [IconComponent],
  template: `<upup-icon name="player-play" [size]="size" />`,
})
export class PlayerPlayFilledIconComponent {
  @Input() size: number = 24;
}
