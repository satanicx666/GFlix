import { afterEach, describe, expect, it, vi } from "vitest";
import { publicClient } from "./public-client.server";

afterEach(() => vi.unstubAllGlobals());

describe("stateless playback session verification", () => {
  it("verifies a supplied session with Auth instead of treating it as missing", async () => {
    const request = vi.fn(async (_input: unknown, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-session-token");
      return new Response(JSON.stringify({ id: "verified-user", aud: "authenticated", role: "authenticated" }), { headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", request);
    const client = publicClient("https://auth.example.test", "sb_publishable_test", "Bearer test-session-token");
    const { data, error } = await client.auth.getUser();
    expect(error).toBeNull();
    expect(data.user?.id).toBe("verified-user");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("keeps rejected sessions rejected rather than falling back to guest access", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ message: "Invalid session", code: "bad_jwt" }), { status: 401, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", request);
    const client = publicClient("https://auth.example.test", "sb_publishable_test", "Bearer invalid-session");
    const { data, error } = await client.auth.getUser();
    expect(data.user).toBeNull();
    expect(error).not.toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
});