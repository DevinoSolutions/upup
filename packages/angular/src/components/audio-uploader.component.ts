import { Component, inject, OnDestroy } from "@angular/core";
import { cn } from "@upup/core";
import { UpupStore } from "../upup-store.service";
import { SourceViewContainerComponent } from "./source-view-container.component";

type RecordingState = "idle" | "recording" | "recorded";

/**
 * Audio recorder leaf — port of AudioUploader.svelte.
 *
 * Slot name : "audio-uploader"
 * (Both the error-state and normal-state SourceViewContainers use slotName="audio-uploader".)
 *
 * Svelte parity:
 *   - All state (recordingState, duration, audioUrl, error) is plain class properties
 *     with change-detection via Angular's default CD.
 *   - MediaRecorder lifecycle (startRecording / stopRecording / discardRecording / addRecording)
 *     mirrors svelte exactly.
 *   - Cleanup on ngOnDestroy (svelte: onDestroy).
 *   - No shared composable — AudioUploader.svelte contains all logic inline.
 *
 * Auto-start guard for tests:
 *   startRecording() only runs on user click, not on mount → no auto-start → no jsdom hang.
 */
@Component({
  selector: "upup-audio-uploader",
  standalone: true,
  imports: [SourceViewContainerComponent],
  template: `
    @if (error) {
      <!-- Error state -->
      <upup-adapter-view-container slotName="audio-uploader">
        <div
          class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center"
        >
          <p [class]="errorTextClass">{{ error }}</p>
        </div>
      </upup-adapter-view-container>
    } @else {
      <!-- Normal state -->
      <upup-adapter-view-container slotName="audio-uploader">
        <div
          class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-6 upup-p-6"
        >
          <!-- Pulsing mic icon -->
          <div [class]="outerRingClass">
            <div [class]="innerRingClass">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
                />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
          </div>

          <span [class]="timerClass">{{ formatTime(duration) }}</span>

          @if (recordingState === "recorded" && audioUrl) {
            <!-- svelte-ignore a11y_media_has_caption -->
            <audio
              controls
              [src]="audioUrl"
              class="upup-w-full upup-max-w-xs"
            ></audio>
          }

          <div class="upup-flex upup-gap-3">
            @if (recordingState === "idle") {
              <button
                type="button"
                [class]="startButtonClass"
                (click)="startRecording()"
              >
                Start Recording
              </button>
            }

            @if (recordingState === "recording") {
              <button
                type="button"
                class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
                (click)="stopRecording()"
              >
                Stop Recording
              </button>
            }

            @if (recordingState === "recorded") {
              <button
                type="button"
                class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
                (click)="discardRecording()"
              >
                Discard
              </button>
              <button
                type="button"
                [class]="addButtonClass"
                (click)="addRecording()"
              >
                Add Recording
              </button>
            }
          </div>
        </div>
      </upup-adapter-view-container>
    }
  `,
})
export class AudioUploaderComponent implements OnDestroy {
  readonly store = inject(UpupStore);

  recordingState: RecordingState = "idle";
  duration = 0;
  audioUrl: string | null = null;
  error: string | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private streamRef: MediaStream | null = null;

  ngOnDestroy(): void {
    if (this.timerHandle) clearInterval(this.timerHandle);
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.streamRef?.getTracks().forEach((t) => t.stop());
  }

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.streamRef = stream;
      this.chunks = [];
      const recorder = new MediaRecorder(stream);
      this.mediaRecorder = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        this.audioUrl = URL.createObjectURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      this.recordingState = "recording";
      this.duration = 0;
      this.timerHandle = setInterval(() => {
        this.duration++;
      }, 1000);
    } catch {
      this.error =
        "Microphone access denied. Please allow microphone access and try again.";
    }
  }

  stopRecording(): void {
    this.mediaRecorder?.stop();
    if (this.timerHandle) clearInterval(this.timerHandle);
    this.recordingState = "recorded";
  }

  discardRecording(): void {
    if (this.audioUrl) URL.revokeObjectURL(this.audioUrl);
    this.audioUrl = null;
    this.duration = 0;
    this.recordingState = "idle";
  }

  addRecording(): void {
    if (!this.audioUrl) return;
    const ext = this.mediaRecorder?.mimeType?.includes("webm") ? "webm" : "ogg";
    fetch(this.audioUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `recording-${Date.now()}.${ext}`, {
          type: blob.type,
        });
        void this.store.handleSetSelectedFiles([file]);
        this.store.setActiveSource(undefined);
      });
  }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  // ── Class builders ────────────────────────────────────────────────────────

  get errorTextClass(): string {
    return cn("upup-text-sm upup-text-red-500", {
      "upup-text-red-400": this.store.isDark(),
    });
  }

  get outerRingClass(): string {
    return cn(
      "upup-flex upup-h-24 upup-w-24 upup-items-center upup-justify-center upup-rounded-full",
      {
        "upup-bg-red-500/20": this.recordingState === "recording",
        "upup-bg-blue-500/20":
          this.recordingState === "idle" || this.recordingState === "recorded",
      },
    );
  }

  get innerRingClass(): string {
    return cn(
      "upup-flex upup-h-16 upup-w-16 upup-items-center upup-justify-center upup-rounded-full upup-transition-all",
      {
        "upup-animate-pulse upup-bg-red-500":
          this.recordingState === "recording",
        "upup-bg-blue-500":
          this.recordingState === "idle" || this.recordingState === "recorded",
      },
    );
  }

  get timerClass(): string {
    return cn("upup-text-2xl upup-font-mono upup-tabular-nums", {
      "upup-text-[#1b1b1b]": !this.store.isDark(),
      "upup-text-white": this.store.isDark(),
    });
  }

  get startButtonClass(): string {
    return cn(
      "upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700",
      {
        "upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]":
          this.store.isDark(),
      },
    );
  }

  get addButtonClass(): string {
    return cn(
      "upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700",
      {
        "upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]":
          this.store.isDark(),
      },
    );
  }
}
