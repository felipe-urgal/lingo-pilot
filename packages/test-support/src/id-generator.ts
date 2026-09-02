import type { IdGenerator } from "@lingo-pilot/domain";

export class DeterministicIdGenerator implements IdGenerator {
  private sequence = 0;

  constructor(private readonly prefix = "test-id") {}

  generate(): string {
    this.sequence += 1;
    return `${this.prefix}-${String(this.sequence).padStart(4, "0")}`;
  }
}
