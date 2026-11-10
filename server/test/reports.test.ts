import assert from "node:assert/strict";
import fs from "fs/promises";
import { randomUUID } from "crypto";
import { after, beforeEach, describe, it } from "node:test";
import request from "supertest";
import { createApp } from "../src/app";
import { getPrisma } from "../src/lib/prisma";
import { uploadsDir } from "../src/storage/localImages";

const app = createApp();
const prisma = getPrisma();

function photo(contents: string) {
  return Buffer.from(contents);
}

async function uploadPhoto(
  reportClientId: string,
  imageClientId: string,
  position: number,
  contents = "photo",
  mimeType = "image/jpeg",
) {
  const response = await request(app)
    .post(`/reports/${reportClientId}/images`)
    .field("imageClientId", imageClientId)
    .field("position", String(position))
    .attach("file", photo(contents), {
      filename: "photo.jpg",
      contentType: mimeType,
    });

  return response;
}

beforeEach(async () => {
  await prisma.image.deleteMany();
  await prisma.report.deleteMany();
  await fs.rm(uploadsDir, { recursive: true, force: true });
});

after(async () => {
  await prisma.$disconnect();
});

describe("photos", () => {
  it("stores a photo once when the same photo id is sent again", async () => {
    const reportClientId = randomUUID();
    const imageClientId = randomUUID();

    const first = await uploadPhoto(reportClientId, imageClientId, 0, "first");
    const second = await uploadPhoto(reportClientId, imageClientId, 0, "second-try");

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.id, first.body.id);
    assert.equal(second.body.bytes, first.body.bytes);
    assert.equal(await prisma.image.count(), 1);
    assert.equal(await prisma.report.count(), 1);
  });

  it("rejects a sixth photo", async () => {
    const reportClientId = randomUUID();

    for (let position = 0; position < 5; position += 1) {
      const saved = await uploadPhoto(reportClientId, randomUUID(), position);
      assert.equal(saved.status, 200);
    }

    const extra = await uploadPhoto(reportClientId, randomUUID(), 0);

    assert.equal(extra.status, 409);
    assert.equal(extra.body.error, "A report can hold 5 photos");
    assert.equal(await prisma.image.count(), 5);
  });

  it("rejects a second photo in a position that is already used", async () => {
    const reportClientId = randomUUID();
    const first = await uploadPhoto(reportClientId, randomUUID(), 1);
    const second = await uploadPhoto(reportClientId, randomUUID(), 1);

    assert.equal(first.status, 200);
    assert.equal(second.status, 409);
    assert.equal(second.body.error, "That photo position is already used");
    assert.equal(await prisma.image.count(), 1);
  });

  it("rejects a file that is not a jpeg, png, or webp", async () => {
    const response = await uploadPhoto(
      randomUUID(),
      randomUUID(),
      0,
      "notes",
      "text/plain",
    );

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Photo must be a jpeg, png, or webp");
    assert.equal(await prisma.image.count(), 0);
  });

  it("rejects a new photo after the report is complete", async () => {
    const reportClientId = randomUUID();
    const imageClientId = randomUUID();

    await uploadPhoto(reportClientId, imageClientId, 0, "original-photo");
    const completed = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "Crack in the stair" });
    const extra = await uploadPhoto(reportClientId, randomUUID(), 1);
    const replay = await uploadPhoto(reportClientId, imageClientId, 0, "x");

    assert.equal(completed.status, 200);
    assert.equal(extra.status, 409);
    assert.equal(extra.body.error, "Report is already complete");
    assert.equal(replay.status, 200);
    assert.equal(replay.body.bytes, photo("original-photo").length);
  });
});

describe("complete", () => {
  it("returns 404 when the report has no photos", async () => {
    const response = await request(app)
      .post(`/reports/${randomUUID()}/complete`)
      .send({ description: "Nothing attached" });

    assert.equal(response.status, 404);
    assert.equal(response.body.error, "Report not found");
  });

  it("keeps a blank description off the server list", async () => {
    const reportClientId = randomUUID();
    await uploadPhoto(reportClientId, randomUUID(), 0);

    const completed = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "   " });
    const list = await request(app).get("/reports");

    assert.equal(completed.status, 400);
    assert.equal(completed.body.error, "Description is required");
    assert.deepEqual(list.body.reports, []);
  });

  it("rejects a description longer than 500 characters", async () => {
    const reportClientId = randomUUID();
    await uploadPhoto(reportClientId, randomUUID(), 0);

    const completed = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "a".repeat(501) });

    assert.equal(completed.status, 400);
    assert.equal(completed.body.error, "Description is too long");
  });

  it("finishes a report once and ignores a second description", async () => {
    const reportClientId = randomUUID();
    await uploadPhoto(reportClientId, randomUUID(), 0);
    await uploadPhoto(reportClientId, randomUUID(), 1);

    const first = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "Crack in the stair" });
    const second = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "A different note" });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.body.id, first.body.id);
    assert.equal(second.body.description, "Crack in the stair");
    assert.equal(second.body.status, "complete");
    assert.equal(second.body.images.length, 2);
    assert.equal(await prisma.report.count({ where: { status: "complete" } }), 1);
  });
});

describe("reading reports", () => {
  it("returns a report only after it is complete", async () => {
    const reportClientId = randomUUID();
    await uploadPhoto(reportClientId, randomUUID(), 0);
    const stored = await prisma.report.findUniqueOrThrow({
      where: { clientId: reportClientId },
    });
    const hidden = await request(app).get(`/reports/${stored.id}`);
    const completed = await request(app)
      .post(`/reports/${reportClientId}/complete`)
      .send({ description: "Loose handrail" });
    const visible = await request(app).get(`/reports/${completed.body.id}`);
    const list = await request(app).get("/reports");

    assert.equal(hidden.status, 404);
    assert.equal(visible.status, 200);
    assert.equal(visible.body.description, "Loose handrail");
    assert.equal(list.body.reports.length, 1);
    assert.equal(list.body.reports[0].id, completed.body.id);
  });
});
