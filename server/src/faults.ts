import { NextFunction, Request, Response } from "express";

export const faultModes = [
  "off",
  "latency",
  "drop",
  "refuse",
  "reject",
  "hang",
] as const;

export type FaultMode = (typeof faultModes)[number];

type ActiveFault = {
  mode: Exclude<FaultMode, "off">;
  remaining: number;
};

export const faults = {
  latencyMs: 8000,
};

let active: ActiveFault | null = null;

export function clearFault() {
  active = null;
}

export function currentFault() {
  if (!active) {
    return { mode: "off" as const, remaining: 0 };
  }

  return { mode: active.mode, remaining: active.remaining };
}

export function setFault(mode: FaultMode, times = 1) {
  if (mode === "off") {
    active = null;
    return currentFault();
  }

  active = { mode, remaining: times };
  return currentFault();
}

export function applyFault(req: Request, res: Response, next: NextFunction) {
  if (!active) {
    next();
    return;
  }

  const mode = active.mode;
  active.remaining -= 1;

  if (active.remaining <= 0) {
    active = null;
  }

  if (mode === "latency") {
    setTimeout(() => {
      if (!res.headersSent && !req.socket.destroyed) {
        next();
      }
    }, faults.latencyMs);
    return;
  }

  if (mode === "drop") {
    req.socket.destroy();
    return;
  }

  if (mode === "refuse") {
    res.status(503).json({ error: "The server is unavailable" });
    return;
  }

  if (mode === "reject") {
    res.status(422).json({ error: "The server rejected this request" });
    return;
  }
}
