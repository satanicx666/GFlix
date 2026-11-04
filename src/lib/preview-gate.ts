// A single owner across all rows; tokens also invalidate late async responses.
export class PreviewGate {
  private current: { token: symbol; close: () => void } | null = null;

  claim(close: () => void) {
    this.current?.close();
    const token = Symbol("preview");
    this.current = { token, close };
    return token;
  }

  owns(token: symbol) {
    return this.current?.token === token;
  }

  release(token: symbol) {
    if (this.owns(token)) this.current = null;
  }
}

export const previewGate = new PreviewGate();