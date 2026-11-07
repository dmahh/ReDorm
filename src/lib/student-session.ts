// Device-local record of a verified student (no full authentication in the MVP).
import { useSyncExternalStore } from "react";
import type { Student, StudentSession } from "./redorm";

const KEY = "redorm.student.v1";
type Stored = { student: Student; token: string };

const listeners = new Set<() => void>();
let cache: Stored | null | undefined;

function read(): Stored | null {
  if (cache !== undefined) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function saveStudent(value: Stored) {
  window.localStorage.setItem(KEY, JSON.stringify(value));
  cache = value;
  listeners.forEach((l) => l());
}

export function clearStudent() {
  window.localStorage.removeItem(KEY);
  cache = null;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Returns undefined during SSR / before hydration, null when not verified. */
export function useStudent(): Stored | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

export function toSession(s: Stored): StudentSession {
  return { studentId: s.student.id, token: s.token };
}
