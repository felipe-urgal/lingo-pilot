type ProviderStep<TOutput> = () => TOutput | Promise<TOutput>;

export class ScriptedProviderFake<TInput, TOutput> {
  readonly calls: TInput[] = [];
  private readonly steps: ProviderStep<TOutput>[];

  constructor(steps: readonly ProviderStep<TOutput>[]) {
    this.steps = [...steps];
  }

  async execute(input: TInput): Promise<TOutput> {
    this.calls.push(input);
    const step = this.steps.shift();

    if (!step) {
      throw new Error("No scripted provider response remains");
    }

    return step();
  }
}
