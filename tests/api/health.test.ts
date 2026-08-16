import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../apps/api/src/app";

describe("GET /api/v1/health", () => {
  it("returns 200 with healthy status", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe("healthy");
    expect(res.body.data).toHaveProperty("version");
    expect(res.body.data).toHaveProperty("uptime");
    expect(res.body.data).toHaveProperty("timestamp");
    expect(res.body.data).toHaveProperty("environment");
  });

  it("preserves client-provided X-Request-ID", async () => {
    const res = await request(app)
      .get("/api/v1/health")
      .set("X-Request-ID", "test-req-123");

    expect(res.headers["x-request-id"]).toBe("test-req-123");
    expect(res.body.requestId).toBe("test-req-123");
  });

  it("generates X-Request-ID when none is provided", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.headers["x-request-id"]).toBeDefined();
    expect(res.body.requestId).toBeDefined();
    // UUID v4 format
    expect(res.body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns valid ISO timestamp", async () => {
    const res = await request(app).get("/api/v1/health");

    const timestamp = new Date(res.body.data.timestamp);
    expect(timestamp.getTime()).not.toBeNaN();
  });

  it("returns numeric uptime", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(typeof res.body.data.uptime).toBe("number");
    expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe("API error handling", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const res = await request(app).get("/api/v1/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Cannot GET /api/v1/nonexistent");
    expect(res.body.requestId).toBeDefined();
  });
});
