import { describe, it, expect } from "vitest";
import { FileSource } from "@upup/core";
import { sourceNameKeys, uploadSourceObject } from "../src/lib/constants";

// ─────────────────────────────────────────────
// sourceNameKeys
// ─────────────────────────────────────────────
describe("sourceNameKeys", () => {
  it("covers all FileSource values", () => {
    const sourceCount = Object.keys(FileSource).length;
    const mappingCount = Object.keys(sourceNameKeys).length;
    expect(mappingCount).toBe(sourceCount);
  });
});

// ─────────────────────────────────────────────
// uploadSourceObject
// ─────────────────────────────────────────────
describe("uploadSourceObject", () => {
  it("has an entry for every FileSource", () => {
    const sourceCount = Object.keys(FileSource).length;
    expect(Object.keys(uploadSourceObject).length).toBe(sourceCount);
  });

  it("local entry has undefined View (device file picker)", () => {
    expect(uploadSourceObject[FileSource.LOCAL].View).toBeUndefined();
  });

  it("every non-local entry has a View", () => {
    for (const [key, entry] of Object.entries(uploadSourceObject)) {
      if (key === FileSource.LOCAL) continue;
      expect(entry.View, `${key} entry has a View`).toBeDefined();
    }
  });

  it("each entry id matches its FileSource key", () => {
    for (const [key, entry] of Object.entries(uploadSourceObject)) {
      expect(entry.id).toBe(key);
    }
  });

  it("each entry nameKey matches sourceNameKeys", () => {
    for (const [key, entry] of Object.entries(uploadSourceObject)) {
      expect(entry.nameKey).toBe(sourceNameKeys[key as FileSource]);
    }
  });

  it("each entry has an Icon", () => {
    for (const entry of Object.values(uploadSourceObject)) {
      expect(entry.Icon).toBeDefined();
    }
  });
});
