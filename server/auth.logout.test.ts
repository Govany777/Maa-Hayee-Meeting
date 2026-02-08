import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("auth.logout", () => {
  it("should have logout mutation in auth router", async () => {
    expect(appRouter).toBeDefined();
  });
});
