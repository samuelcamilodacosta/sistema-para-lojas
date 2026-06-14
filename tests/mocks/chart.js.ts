import { vi } from 'vitest';

export default class Chart {
  static register = vi.fn();

  static instances: Chart[] = [];

  destroy = vi.fn();

  constructor(
    public canvas: HTMLCanvasElement,
    public config: Record<string, unknown>,
  ) {
    Chart.instances.push(this);
  }

  static last(): Chart {
    return Chart.instances[Chart.instances.length - 1];
  }

  static reset(): void {
    Chart.instances = [];
  }
}
