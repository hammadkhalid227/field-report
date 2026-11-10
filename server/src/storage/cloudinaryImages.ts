import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { HttpError } from "../httpError";

export const maxPhotoBytes = 5 * 1024 * 1024;
export const photoTooLargeMessage = "Photo must be 5 MB or smaller";

const formats: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function assertSupportedPhoto(mimeType: string) {
  if (!formats[mimeType]) {
    throw new HttpError(400, "Photo must be a jpeg, png, or webp");
  }
}

export function cloudinaryUploadOptions(imageClientId: string, mimeType: string) {
  assertSupportedPhoto(mimeType);

  return {
    public_id: imageClientId,
    folder: "field-reports",
    resource_type: "image" as const,
    overwrite: true,
    unique_filename: false,
    format: formats[mimeType],
  };
}

function requireCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new HttpError(500, "Photo storage is not configured");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function uploadPhoto(
  imageClientId: string,
  buffer: Buffer,
  mimeType: string,
) {
  requireCloudinaryConfig();

  const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      cloudinaryUploadOptions(imageClientId, mimeType),
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }

        resolve(result);
      },
    );

    stream.end(buffer);
  });

  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
}

export const photoStorage = {
  save: uploadPhoto,
};
