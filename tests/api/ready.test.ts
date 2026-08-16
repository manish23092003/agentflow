import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../apps/api/src/app";

describe("GET /api/v1/ready", () => {
  it("returns 200 with ready status", async () => {
    const res = await request(app).get("/api/v1/ready");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.status).toBe("ready");
    expect(res.body.requestId).toBeDefined();
  });
});
