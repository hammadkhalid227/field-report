import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cloudinaryUploadOptions } from "../src/storage/cloudinaryImages";

describe("cloudinary upload", () => {
  it("keeps one Cloudinary file per photo id", () => {
    const imageClientId = "6f1b0c3e-3c1a-4e5a-9c1e-2b4d6f8a0c11";

    assert.deepEqual(cloudinaryUploadOptions(imageClientId, "image/jpeg"), {
      public_id: imageClientId,
      folder: "field-reports",
      resource_type: "image",
      overwrite: true,
      unique_filename: false,
      format: "jpg",
    });
  });
});