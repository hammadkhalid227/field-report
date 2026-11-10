import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { applyFault } from "../faults";
import { HttpError } from "../httpError";
import { maxPhotoBytes, photoTooLargeMessage } from "../storage/cloudinaryImages";
import {
  completeReport,
  getReport,
  listReports,
  saveImage,
} from "../services/reports";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxPhotoBytes },
});

const clientParams = z.object({
  clientId: z.string().uuid(),
});

const reportParams = z.object({
  id: z.string().uuid(),
});

const imageFields = z.object({
  imageClientId: z.string().uuid(),
  position: z.coerce.number().int().min(0).max(4),
});

const completeBody = z.object({
  description: z.string({ required_error: "Description is required" }),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  }

  return parsed.data;
}

function toImage(image: {
  id: string;
  clientId: string;
  position: number;
  url: string;
  bytes: number;
}) {
  return {
    id: image.id,
    clientId: image.clientId,
    position: image.position,
    url: image.url,
    bytes: image.bytes,
  };
}

function toReport(report: {
  id: string;
  clientId: string;
  description: string;
  status: string;
  images: {
    id: string;
    clientId: string;
    position: number;
    url: string;
    bytes: number;
  }[];
}) {
  return {
    id: report.id,
    clientId: report.clientId,
    description: report.description,
    status: report.status,
    images: report.images.map(toImage),
  };
}

export const reportsRouter = Router();

reportsRouter.post(
  "/reports/:clientId/images",
  applyFault,
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        next(new HttpError(413, photoTooLargeMessage));
        return;
      }

      next(error);
    });
  },
  async (req, res, next) => {
    try {
      const { clientId } = parse(clientParams, req.params);
      const fields = parse(imageFields, req.body);

      if (!req.file) {
        throw new HttpError(400, "Photo file is required");
      }

      const image = await saveImage({
        reportClientId: clientId,
        imageClientId: fields.imageClientId,
        position: fields.position,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });

      res.status(200).json({
        id: image.id,
        clientId: image.clientId,
        reportClientId: image.report.clientId,
        position: image.position,
        url: image.url,
        bytes: image.bytes,
      });
    } catch (error) {
      next(error);
    }
  },
);

reportsRouter.post("/reports/:clientId/complete", applyFault, async (req, res, next) => {
  try {
    const { clientId } = parse(clientParams, req.params);
    const body = parse(completeBody, req.body);
    const report = await completeReport(clientId, body.description);
    res.status(200).json(toReport(report));
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/reports", async (_req, res, next) => {
  try {
    const reports = await listReports();
    res.status(200).json({ reports: reports.map(toReport) });
  } catch (error) {
    next(error);
  }
});

reportsRouter.get("/reports/:id", async (req, res, next) => {
  try {
    const { id } = parse(reportParams, req.params);
    const report = await getReport(id);
    res.status(200).json(toReport(report));
  } catch (error) {
    next(error);
  }
});
