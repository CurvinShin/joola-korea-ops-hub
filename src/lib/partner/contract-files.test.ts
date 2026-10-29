import { describe, expect, it } from "vitest";
import {
  CONTRACT_MAX_BYTES,
  contractStoragePath,
  formatFileSize,
  isContractPathFor,
  validateContractPdf,
} from "./contract-files";

describe("validateContractPdf", () => {
  it("accepts a normal PDF", () => {
    expect(validateContractPdf({ name: "계약서.pdf", size: 1000, type: "application/pdf" }).ok).toBe(true);
  });
  it("accepts a .pdf with an empty mime type", () => {
    expect(validateContractPdf({ name: "a.PDF", size: 1000, type: "" }).ok).toBe(true);
  });
  it("rejects non-PDF files", () => {
    expect(validateContractPdf({ name: "a.png", size: 1000, type: "image/png" }).ok).toBe(false);
  });
  it("rejects empty and oversized files", () => {
    expect(validateContractPdf({ name: "a.pdf", size: 0, type: "application/pdf" }).ok).toBe(false);
    expect(validateContractPdf({ name: "a.pdf", size: CONTRACT_MAX_BYTES + 1, type: "application/pdf" }).ok).toBe(false);
    expect(validateContractPdf({ name: "a.pdf", size: CONTRACT_MAX_BYTES, type: "application/pdf" }).ok).toBe(true);
  });
});

describe("contract paths", () => {
  it("builds a path under the facility folder", () => {
    expect(contractStoragePath("f1", "u1")).toBe("f1/u1.pdf");
  });
  it("only accepts paths inside the same facility", () => {
    expect(isContractPathFor("f1", "f1/u1.pdf")).toBe(true);
    expect(isContractPathFor("f1", "f2/u1.pdf")).toBe(false);
    expect(isContractPathFor("f1", "f1/../f2/u1.pdf")).toBe(false);
    expect(isContractPathFor("f1", "f1/u1.png")).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("formats KB and MB", () => {
    expect(formatFileSize(500)).toBe("1KB");
    expect(formatFileSize(2048)).toBe("2KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0MB");
    expect(formatFileSize(null)).toBe("—");
  });
});
