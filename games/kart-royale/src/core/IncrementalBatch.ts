/**
 * Resumable deterministic batch runner (fix-kart-royale-instant-entry 5.3).
 *
 * Each step runs atomically; partial progress is preserved across yields.
 */

export interface BatchStep {
  id: string;
  run: () => void;
}

export interface BatchRunResult {
  done: boolean;
  cancelled: boolean;
  stepsRun: number;
  stepId: string | null;
}

export class IncrementalBatchRunner {
  private index = 0;

  constructor(
    private readonly steps: BatchStep[],
    private readonly signal: AbortSignal | null = null,
    private readonly now: () => number = () => performance.now(),
  ) {}

  get done(): boolean {
    return this.index >= this.steps.length;
  }

  get progress(): number {
    return this.steps.length === 0 ? 1 : this.index / this.steps.length;
  }

  get currentStepId(): string | null {
    return this.steps[this.index]?.id ?? null;
  }

  reset(): void {
    this.index = 0;
  }

  runAll(): BatchRunResult {
    let stepsRun = 0;
    while (!this.done) {
      if (this.signal?.aborted) {
        return { done: false, cancelled: true, stepsRun, stepId: this.currentStepId };
      }
      const step = this.steps[this.index];
      step.run();
      this.index += 1;
      stepsRun += 1;
    }
    return { done: true, cancelled: false, stepsRun, stepId: null };
  }

  runUntil(budgetMs: number): BatchRunResult {
    if (budgetMs <= 0 || this.done) {
      return { done: this.done, cancelled: false, stepsRun: 0, stepId: this.currentStepId };
    }
    const deadline = this.now() + budgetMs;
    let stepsRun = 0;
    let stepId: string | null = null;
    while (!this.done && this.now() < deadline) {
      if (this.signal?.aborted) {
        return { done: false, cancelled: true, stepsRun, stepId: this.currentStepId };
      }
      const step = this.steps[this.index];
      stepId = step.id;
      step.run();
      this.index += 1;
      stepsRun += 1;
    }
    return {
      done: this.done,
      cancelled: false,
      stepsRun,
      stepId,
    };
  }
}
