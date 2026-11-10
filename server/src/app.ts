import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "./httpError";
import { reportsRouter } from "./routes/reports";
import { uploadsDir } from "./storage/localImages";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(reportsRouter);

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
