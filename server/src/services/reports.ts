import { Prisma } from "@prisma/client";
import { HttpError } from "../httpError";
import { getPrisma } from "../lib/prisma";
import {
  assertSupportedPhoto,
  maxPhotoBytes,
  photoStorage,
  photoTooLargeMessage,
} from "../storage/cloudinaryImages";

const reportWithImages = {
  images: {
    orderBy: {
      position: "asc" as const,
    },
  },
};

const imageWithReport = {
  report: true,
};

type SaveImageInput = {
  reportClientId: string;
  imageClientId: string;
  position: number;
  mimeType: string;
  buffer: Buffer;
};

export async function saveImage(input: SaveImageInput) {
  const existing = await getPrisma().image.findUnique({
    where: { clientId: input.imageClientId },
    include: imageWithReport,
  });

  if (existing) {
    return existing;
  }

  assertSupportedPhoto(input.mimeType);

  if (input.buffer.length > maxPhotoBytes) {
    throw new HttpError(413, photoTooLargeMessage);
  }

  try {
    return await getPrisma().$transaction(async (tx) => {
      const report = await tx.report.upsert({
        where: { clientId: input.reportClientId },
        update: {},
        create: { clientId: input.reportClientId },
        include: { images: true },
      });

      if (report.status === "complete") {
        throw new HttpError(409, "Report is already complete");
      }

      if (report.images.length >= 5) {
        throw new HttpError(409, "A report can hold 5 photos");
      }

      if (report.images.some((image) => image.position === input.position)) {
        throw new HttpError(409, "That photo position is already used");
      }

      let stored: { url: string; publicId: string };

      try {
        stored = await photoStorage.save(
          input.imageClientId,
          input.buffer,
          input.mimeType,
        );
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        
        throw new HttpError(502, "Photo storage failed");
      }

      return tx.image.create({
        data: {
          clientId: input.imageClientId,
          reportId: report.id,
          position: input.position,
          url: stored.url,
          publicId: stored.publicId,
          bytes: input.buffer.length,
        },
        include: imageWithReport,
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await getPrisma().image.findUnique({
        where: { clientId: input.imageClientId },
        include: imageWithReport,
      });

      if (replay) {
        return replay;
      }

      throw new HttpError(409, "That photo position is already used");
    }

    throw error;
  }
}

export async function completeReport(
  reportClientId: string,
  description: string,
) {
  const existing = await getPrisma().report.findUnique({
    where: { clientId: reportClientId },
    include: reportWithImages,
  });

  if (!existing) {
    throw new HttpError(404, "Report not found");
  }

  if (existing.status === "complete") {
    return existing;
  }

  const trimmed = description.trim();

  if (!trimmed) {
    throw new HttpError(400, "Description is required");
  }

  if (trimmed.length > 500) {
    throw new HttpError(400, "Description is too long");
  }

  if (existing.images.length < 1) {
    throw new HttpError(409, "A report needs 1 to 5 photos");
  }

  await getPrisma().report.updateMany({
    where: {
      id: existing.id,
      status: "receiving",
    },
    data: {
      description: trimmed,
      status: "complete",
      completedAt: new Date(),
    },
  });

  const finished = await getPrisma().report.findUnique({
    where: { id: existing.id },
    include: reportWithImages,
  });

  if (!finished) {
    throw new HttpError(404, "Report not found");
  }

  return finished;
}

export function listReports() {
  return getPrisma().report.findMany({
    where: { status: "complete" },
    include: reportWithImages,
    orderBy: { completedAt: "desc" },
  });
}

export async function getReport(id: string) {
  const report = await getPrisma().report.findFirst({
    where: {
      id,
      status: "complete",
    },
    include: reportWithImages,
  });

  if (!report) {
    throw new HttpError(404, "Report not found");
  }

  return report;
}
