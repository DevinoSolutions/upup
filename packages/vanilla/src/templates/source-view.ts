import { html, nothing } from "lit-html";
import { cn } from "../lib/cn";
import type { UploaderContext } from "../lib/types";
import { uploadSourceObject } from "../lib/constants";

export function sourceView(ctx: UploaderContext) {
  const active = ctx.orchestrator.getSnapshot().activeSource;
  const entry = active ? uploadSourceObject[active] : undefined;
  const View = entry?.View;
  const Icon = entry?.Icon;
  const isDark = ctx.theme.getSnapshot().isDark;
  const slot = ctx.theme.getSnapshot().slotOverrides;
  const tr = ctx.translations;
  const shouldShow = !!View && !ctx.props.mini && !!active && !!Icon;
  if (!shouldShow) return nothing;

  const handleCancel = () => {
    ctx.core.emit("source-view-cancel", { sourceId: active });
    ctx.setActiveSource(undefined);
  };
  return html`
    <div
      class="upup-grid upup-h-full upup-w-full upup-grid-rows-[auto,1fr]"
      data-upup-slot="adapter-view"
    >
      <div
        class=${cn(
          "upup-shadow-bottom upup-flex upup-items-center upup-justify-between upup-bg-black/[0.025] upup-px-3 upup-py-2 upup-text-sm upup-font-medium upup-text-[#1b5dab]",
          {
            "upup-bg-white/5 upup-text-[#FAFAFA] dark:upup-bg-white/5 dark:upup-text-[#FAFAFA]":
              isDark,
          },
          slot.sourceViewHeader,
        )}
      >
        ${Icon ? Icon() : nothing}
        <button
          class=${cn(
            "upup-rounded-md upup-p-1 upup-text-blue-600 upup-transition-all upup-duration-300",
            { "upup-text-[#30C5F7] dark:upup-text-[#30C5F7]": isDark },
            slot.sourceViewCancelButton,
          )}
          @click=${handleCancel}
          type="button"
        >
          ${tr.cancel}
        </button>
      </div>
      ${View ? View(ctx) : nothing}
    </div>
  `;
}
