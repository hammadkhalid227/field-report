import { Router } from "express";
import { z } from "zod";
import { faultModes, setFault } from "../faults";
import { HttpError } from "../httpError";

const faultBody = z.object({
  mode: z.enum(faultModes),
  times: z.number().int().min(1).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid request");
  }

  return parsed.data;
}

export const faultsRouter = Router();

faultsRouter.post("/dev/faults", (req, res, next) => {
  try {
    const body = parse(faultBody, req.body);
    res.status(200).json(setFault(body.mode, body.times ?? 1));
  } catch (error) {
    next(error);
  }
});
