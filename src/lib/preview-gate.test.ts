import { describe, expect, it, vi } from "vitest";
import { PreviewGate } from "./preview-gate";

describe("hover preview ownership", () => {
  it("closes the previous preview when a different card opens", () => {
    const gate = new PreviewGate();
    const close = vi.fn();
    const first = gate.claim(close);
    const second = gate.claim(vi.fn());
    expect(close).toHaveBeenCalledTimes(1);
    expect(gate.owns(first)).toBe(false);
    expect(gate.owns(second)).toBe(true);
  });
  it("invalidates pending trailer responses after scroll dismissal", () => {
    const gate = new PreviewGate();
    const pending = gate.claim(vi.fn());
    gate.release(pending);
    expect(gate.owns(pending)).toBe(false);
  });
  it("old cleanup cannot dismiss the next card", () => {
    const gate = new PreviewGate();
    const first = gate.claim(vi.fn());
    const second = gate.claim(vi.fn());
    gate.release(first);
    expect(gate.owns(second)).toBe(true);
  });
});