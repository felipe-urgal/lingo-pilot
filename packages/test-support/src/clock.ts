import type { Clock } from "@lingo-pilot/domain";

const DEFAULT_NOW = new Date("2026-01-01T00:00:00.000Z");

export class FakeClock implements Clock {
  private current: Date;

  constructor(current: Date = DEFAULT_NOW) {
    this.current = new Date(current.getTime());
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  advanceBy(milliseconds: number): Date {
    if (!Number.isFinite(milliseconds)) {
      throw new TypeError("Clock advance must be a finite number of milliseconds");
    }

    this.current = new Date(this.current.getTime() + milliseconds);
    return this.now();
  }

  set(current: Date): Date {
    this.current = new Date(current.getTime());
    return this.now();
  }
}
