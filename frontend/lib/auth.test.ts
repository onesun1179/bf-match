import {afterEach, describe, expect, it, vi} from "vitest";
import {submitScore} from "@/lib/auth";

describe("submitScore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("sends winnerTeam payload to /score endpoint", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 100, groupId: 10 }),
    } as Response);

    await submitScore(10, 100, "B");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/groups/10/games/100/score");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    const headers = new Headers(init.headers as HeadersInit);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ winnerTeam: "B" }));
  });
});
