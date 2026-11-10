import express, { NextFunction, Request, Response } from "express";
import { HttpError } from "./httpError";
import { faultsRouter } from "./routes/faults";
import { reportsRouter } from "./routes/reports";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  if (process.env.NODE_ENV !== "production") {
    app.use(faultsRouter);
  }

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
