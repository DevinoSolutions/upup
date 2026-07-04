import { html, nothing } from "lit-html";
import { ref } from "lit-html/directives/ref.js";
import { cn } from "@upup/core";
import type { UploaderContext } from "../lib/types";
import { sourceViewContainer } from "./shared/source-view-container";

export function screenCaptureUploader(ctx: UploaderContext) {
  const sc = ctx.controllers.getScreen();
  const s = sc.getSnapshot();
  const isDark = ctx.theme.getSnapshot().isDark;

  if (s.error) {
    return sourceViewContainer(
      ctx,
      { dataUpupSlot: "screen-capture-uploader" },
      html` <div
        class="upup-flex upup-flex-col upup-items-center upup-gap-3 upup-p-6 upup-text-center"
      >
        <p
          class=${cn("upup-text-sm upup-text-red-500", {
            "upup-text-red-400": isDark,
          })}
        >
          ${s.error}
        </p>
        <button
          type="button"
          class=${cn(
            "upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2 upup-text-sm upup-font-medium upup-text-white",
            { "upup-bg-[#59D1F9] dark:upup-bg-[#59D1F9]": isDark },
          )}
          @click=${() => sc.retryRecording()}
        >
          Try Again
        </button>
      </div>`,
    );
  }

  const inner = html` <div
    class="upup-flex upup-h-full upup-w-full upup-flex-col upup-items-center upup-justify-center upup-gap-4 upup-p-4"
  >
    ${s.recordingState === "idle"
      ? html` <div class="upup-flex upup-flex-col upup-items-center upup-gap-4">
          <div
            class="upup-flex upup-h-20 upup-w-20 upup-items-center upup-justify-center upup-rounded-full upup-bg-blue-500/20"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke=${isDark ? "#59D1F9" : "#2563eb"}
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect width="20" height="15" x="2" y="3" rx="2" />
              <polyline points="8 21 16 21" />
              <line x1="12" x2="12" y1="18" y2="21" />
            </svg>
          </div>
          <button
            type="button"
            class=${cn(
              "upup-rounded-lg upup-bg-blue-600 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700",
              {
                "upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]":
                  isDark,
              },
            )}
            @click=${() => void sc.startRecording()}
          >
            Share Screen
          </button>
        </div>`
      : nothing}
    ${s.recordingState === "recording"
      ? html` <video
            ${ref(sc.previewRef)}
            muted
            class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
          ></video>
          <div class="upup-flex upup-items-center upup-gap-3">
            <span
              class="upup-h-3 upup-w-3 upup-animate-pulse upup-rounded-full upup-bg-red-500"
            ></span>
            <span
              class=${cn("upup-font-mono upup-text-lg upup-tabular-nums", {
                "upup-text-[#1b1b1b]": !isDark,
                "upup-text-white": isDark,
              })}
              >${sc.formatTime(s.duration)}</span
            >
          </div>
          <button
            type="button"
            class="upup-rounded-lg upup-bg-red-500 upup-px-6 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-red-600"
            @click=${() => sc.stopRecording()}
          >
            Stop Recording
          </button>`
      : nothing}
    ${s.recordingState === "recorded" && s.videoUrl
      ? html` <video
            controls
            src=${s.videoUrl}
            class="upup-w-full upup-max-w-md upup-min-h-0 upup-flex-1 upup-rounded-lg upup-object-contain"
          ></video>
          <div class="upup-flex upup-gap-3">
            <button
              type="button"
              class="upup-rounded-lg upup-bg-gray-500 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-gray-600"
              @click=${() => sc.discardRecording()}
            >
              Discard
            </button>
            <button
              type="button"
              class=${cn(
                "upup-rounded-lg upup-bg-blue-600 upup-px-4 upup-py-2.5 upup-text-sm upup-font-medium upup-text-white upup-transition-colors hover:upup-bg-blue-700",
                {
                  "upup-bg-[#59D1F9] hover:upup-bg-[#40b8e0] dark:upup-bg-[#59D1F9]":
                    isDark,
                },
              )}
              @click=${() => sc.addRecording()}
            >
              Add Recording
            </button>
          </div>`
      : nothing}
  </div>`;

  return sourceViewContainer(
    ctx,
    { dataUpupSlot: "screen-capture-uploader" },
    inner,
  );
}
