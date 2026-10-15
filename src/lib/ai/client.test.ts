import { ApiError } from "@google/genai";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { AI_FALLBACK_MODEL, AI_MODEL, aiErrorMessage, withFallbackModel } = await import("./client");

const overloaded = new ApiError({ message: "high demand", status: 503 });

describe("withFallbackModel", () => {
  it("uses the main model when it answers", async () => {
    const request = vi.fn(async (model: string) => model);
    await expect(withFallbackModel(request)).resolves.toBe(AI_MODEL);
    expect(request).toHaveBeenCalledOnce();
  });

  it("switches to the fallback model once when the main one is overloaded", async () => {
    const request = vi.fn(async (model: string) => {
      if (model === AI_MODEL) throw overloaded;
      return model;
    });
    await expect(withFallbackModel(request)).resolves.toBe(AI_FALLBACK_MODEL);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not hide other errors behind the fallback", async () => {
    const quota = new ApiError({ message: "quota", status: 429 });
    const request = vi.fn(async () => {
      throw quota;
    });
    await expect(withFallbackModel(request)).rejects.toBe(quota);
    expect(request).toHaveBeenCalledOnce();
  });
});

describe("aiErrorMessage", () => {
  it("explains quota and overload in Portuguese", () => {
    expect(aiErrorMessage(new ApiError({ message: "", status: 429 }))).toMatch(/limite de uso gratuito/);
    expect(aiErrorMessage(overloaded)).toMatch(/sobrecarregado/);
    expect(aiErrorMessage(new Error("x"))).toMatch(/não conseguiu responder/);
  });
});
