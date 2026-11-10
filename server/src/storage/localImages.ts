import fs from "fs/promises";
import path from "path";
import { HttpError } from "../httpError";

const extensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const uploadsDir = path.resolve(__dirname, "../../uploads");

export async function storeImage(
  imageClientId: string,
  buffer: Buffer,
  mimeType: string,
) {
  const extension = extensions[mimeType];

  if (!extension) {
    throw new HttpError(400, "Photo must be a jpeg, png, or webp");
  }

  await fs.mkdir(uploadsDir, { recursive: true });
  const filename = `${imageClientId}${extension}`;
  await fs.writeFile(path.join(uploadsDir, filename), buffer);

  return {
    url: `/uploads/${filename}`,
    publicId: imageClientId,
  };
}
