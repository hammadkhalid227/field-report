import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { after, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app";
import { clearFault, faults } from "../src/faults";
import { getPrisma } from "../src/lib/prisma";
import { photoStorage } from "../src/storage/cloudinaryImages";

const app = createApp();
const prisma = getPrisma();

function upload(reportClientId = randomUUID(), imageClientId = randomUUID()) {
  return request(app)
    .post(`/reports/${reportClientId}/images`)
    .field("imageClientId", imageClientId)
    .field("position", "0")
    .attach("file", Buffer.from("photo"), {
      filename: "photo.jpg",
      contentType: "image/jpeg",
    });
}

async function listen() {
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address() as AddressInfo;
  return { server, port: address.port };
}

beforeEach(async () => {
  clearFault();
  faults.latencyMs = 8000;
  photoStorage.save = async (imageClientId) => {
    return {
      url: `https://res.cloudinary.com/demo/image/upload/field-reports/${imageClientId}.jpg`,
      publicId: `field-reports/${imageClientId}`,
    };
  };
  await prisma.image.deleteMany();
  await prisma.report.deleteMany();
});

after(async () => {
  clearFault();
  faults.latencyMs = 8000;
  await prisma.$disconnect();
});

describe("fault switch", () => {
  it("refuses the next upload and then accepts one", async () => {
    const armed = await request(app)
      .post("/dev/faults")
      .send({ mode: "refuse", times: 1 });
    const refused = await upload();
    const accepted = await upload();

    assert.deepEqual(armed.body, { mode: "refuse", remaining: 1 });
    assert.equal(refused.status, 503);
    assert.equal(refused.body.error, "The server is unavailable");
    assert.equal(accepted.status, 200);
    assert.equal(await prisma.image.count(), 1);
  });

  it("rejects the next upload with 422", async () => {
    await request(app).post("/dev/faults").send({ mode: "reject", times: 1 });
    const rejected = await upload();

    assert.equal(rejected.status, 422);
    assert.equal(rejected.body.error, "The server rejected this request");
    assert.equal(await prisma.image.count(), 0);
  });

  it("applies a fault for the number of requests asked", async () => {
    await request(app).post("/dev/faults").send({ mode: "refuse", times: 2 });
    const first = await upload();
    const second = await upload();
    const third = await upload();

    assert.equal(first.status, 503);
    assert.equal(second.status, 503);
    assert.equal(third.status, 200);
  });

  it("leaves list reads alone", async () => {
    await request(app).post("/dev/faults").send({ mode: "refuse", times: 1 });
    const list = await request(app).get("/reports");
    const refused = await upload();

    assert.equal(list.status, 200);
    assert.deepEqual(list.body.reports, []);
    assert.equal(refused.status, 503);
  });

  it("rejects a complete call and then accepts it", async () => {
    const reportClientId = randomUUID();
    const saved = await upload(reportClientId);
    await request(app).post("/dev/faults").send({ mode: "reject" });
    const rejected = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "Loose tile" });
    const listWhileHeld = await request(app).get("/reports");
    const completed = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "Loose tile" });

    assert.equal(saved.status, 200);
    assert.equal(rejected.status, 422);
    assert.deepEqual(listWhileHeld.body.reports, []);
    assert.equal(completed.status, 200);
    assert.equal(completed.body.description, "Loose tile");
  });

  it("turns the switch off", async () => {
    await request(app).post("/dev/faults").send({ mode: "refuse", times: 3 });
    const cleared = await request(app).post("/dev/faults").send({ mode: "off" });
    const saved = await upload();

    assert.deepEqual(cleared.body, { mode: "off", remaining: 0 });
    assert.equal(saved.status, 200);
  });

  it("waits before accepting a slow request", async () => {
    faults.latencyMs = 80;
    await request(app).post("/dev/faults").send({ mode: "latency", times: 1 });
    const started = Date.now();
    const saved = await upload();

    assert.equal(saved.status, 200);
    assert.ok(Date.now() - started >= 70);
  });

  it("drops the connection", async () => {
    await request(app).post("/dev/faults").send({ mode: "drop", times: 1 });

    await assert.rejects(upload());
    assert.equal(await prisma.image.count(), 0);

    const saved = await upload();
    assert.equal(saved.status, 200);
  });

  it("does not answer a hung request", async () => {
    await request(app).post("/dev/faults").send({ mode: "hang", times: 1 });
    const { server, port } = await listen();
    const reportClientId = randomUUID();
    const imageClientId = randomUUID();

    const outcome = await new Promise<string>((resolve) => {
      const pending = request(`http://127.0.0.1:${port}`)
        .post(`/reports/${reportClientId}/images`)
        .field("imageClientId", imageClientId)
        .field("position", "0")
        .attach("file", Buffer.from("photo"), {
          filename: "photo.jpg",
          contentType: "image/jpeg",
        });

      const timer = setTimeout(() => {
        pending.abort();
        resolve("hung");
      }, 400);

      pending.end((error) => {
        clearTimeout(timer);
        resolve(error ? "error" : "answered");
      });
    });

    server.closeAllConnections();
    server.close();

    assert.equal(outcome, "hung");
    assert.equal(await prisma.image.count(), 0);

    const saved = await upload();
    assert.equal(saved.status, 200);
  });

  it("is not available in production", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const productionApp = createApp();
    process.env.NODE_ENV = previous;

    const response = await request(productionApp)
      .post("/dev/faults")
      .send({ mode: "refuse", times: 1 });

    assert.equal(response.status, 404);
  });

  it("rejects an unknown mode", async () => {
    const response = await request(app)
      .post("/dev/faults")
      .send({ mode: "pause", times: 1 });

    assert.equal(response.status, 400);
  });
});
