/** Resolve a mount target. Throws a descriptive TypeError on SSR or a missing target. */
export function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (typeof document === "undefined") {
    throw new TypeError(
      "@upup/vanilla: createUploader() must run in a browser — `document` is undefined (SSR). " +
        "Call it from client-side code (e.g. inside onMounted / useEffect / a DOMContentLoaded handler).",
    );
  }
  const el =
    typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : target;
  if (!el) {
    throw new TypeError(
      `@upup/vanilla: createUploader() target not found: ${
        typeof target === "string"
          ? `selector "${target}"`
          : "the provided element is null"
      }.`,
    );
  }
  return el;
}

/** Create the hidden file input element used by FileInputController. */
export function createHiddenFileInput(
  accept: string,
  multiple: boolean,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  input.style.display = "none";
  input.setAttribute("data-testid", "upup-file-input");
  return input;
}
