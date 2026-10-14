import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestError } from "@/instrumentation";
import { errorDigest, errorMessage, sendErrorEvent } from "./error-reporting";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function sentBody() {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse(init.body);
}

describe("sendErrorEvent", () => {
  it("posts to report_error with the publishable key", async () => {
    await sendErrorEvent({ source: "client", message: "Boom", path: "/dashboard" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.supabase.co/rest/v1/rpc/report_error");
    expect(init.headers.apikey).toBe("sb_publishable_test");
    expect(init.headers.Authorization).toBeUndefined();
    expect(sentBody()).toMatchObject({ p_source: "client", p_message: "Boom", p_path: "/dashboard", p_digest: null });
  });

  it("forwards the user's token when there is one", async () => {
    await sendErrorEvent({ source: "client", message: "Boom" }, "user-token");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer user-token");
  });

  it("never throws when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(sendErrorEvent({ source: "server", message: "Boom" })).resolves.toBeUndefined();
  });

  it("does nothing without Supabase settings", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await sendErrorEvent({ source: "server", message: "Boom" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("error helpers", () => {
  it("formats errors and reads digests", () => {
    expect(errorMessage(new TypeError("x is undefined"))).toBe("TypeError: x is undefined");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorDigest(Object.assign(new Error("e"), { digest: "123" }))).toBe("123");
    expect(errorDigest(new Error("e"))).toBeUndefined();
  });
});

describe("onRequestError", () => {
  const request = { path: "/transactions?q=mercado", method: "GET", headers: { "user-agent": "Vitest" } };
  const context = {
    routerKind: "App Router",
    routePath: "/(app)/transactions",
    routeType: "render",
    renderSource: "react-server-components",
    revalidateReason: undefined,
    renderType: "dynamic",
  } as const;

  it("logs one JSON line and reports in production", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    await onRequestError(Object.assign(new Error("DB down"), { digest: "42" }), request, context);

    expect(console.error).toHaveBeenCalledOnce();
    expect(JSON.parse(vi.mocked(console.error).mock.calls[0][0])).toMatchObject({ digest: "42" });
    expect(sentBody()).toMatchObject({
      p_source: "server",
      p_message: "Error: DB down",
      p_digest: "42",
      p_route: "render /(app)/transactions",
      p_user_agent: "Vitest",
    });
  });

  it("only logs outside production", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("REPORT_ERRORS", "");
    await onRequestError(new Error("DB down"), request, context);
    expect(console.error).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
