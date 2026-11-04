import { describe, expect, it } from "vitest";
import { createPartyCode, partyCodeSchema, createPartySchema } from "./party-invite";

describe("Watch Party invitations", () => {
  it("creates a random 128-bit invite supported by the exact-code lookup", () => {
    const first = createPartyCode();
    expect(first).toMatch(/^[A-F0-9]{32}$/);
    expect(partyCodeSchema.parse(first)).toBe(first);
    expect(createPartyCode()).not.toBe(first);
  });

  it("preserves existing invitations and normalizes pasted codes", () => {
    expect(partyCodeSchema.parse(" abc123 ")).toBe("ABC123");
  });

  it("rejects missing, partial, wildcard and malformed invite codes", () => {
    for (const value of ["", "ABC", "%", "ABC123%", "ABC_12", "A".repeat(33), "' OR true --"]) {
      expect(partyCodeSchema.safeParse(value).success).toBe(false);
    }
  });
  it("requires a numeric PIN for private rooms",()=>{
    const room={type:"movie",tmdbId:862,title:"Toy Story",visibility:"private"};
    expect(createPartySchema.safeParse({...room,pin:"1234"}).success).toBe(true);
    for(const pin of [undefined,"","123","abcd","123456789"]) expect(createPartySchema.safeParse({...room,pin}).success).toBe(false);
  });
  it("does not require a PIN for public rooms",()=>{
    expect(createPartySchema.safeParse({type:"movie",tmdbId:862,title:"Toy Story",visibility:"public"}).success).toBe(true);
  });
});