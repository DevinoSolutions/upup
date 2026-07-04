import type { UploaderController } from "../lib/types";

export interface FileInputDeps {
  getFileInput: () => HTMLInputElement | null;
  setFiles: (files: File[]) => Promise<void>;
  invalidate: () => void;
}

export type FileInputSnapshot = Record<string, never>;

export class FileInputController implements UploaderController<FileInputSnapshot> {
  constructor(private deps: FileInputDeps) {}

  open() {
    const el = this.deps.getFileInput();
    if (el) {
      el.removeAttribute("webkitdirectory");
      el.removeAttribute("directory");
      el.click();
    }
  }

  openFolder() {
    const el = this.deps.getFileInput();
    if (el) {
      el.setAttribute("webkitdirectory", "true");
      el.setAttribute("directory", "true");
      el.click();
    }
  }

  getSnapshot(): FileInputSnapshot {
    return {};
  }

  destroy() {
    /* the input element is owned/cleared by the render loop on destroy */
  }
}
