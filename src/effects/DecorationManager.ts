export interface DecorationSet {
  petals: HTMLElement[];
  flecks: HTMLElement[];
  butterflies: HTMLElement[];
  all: HTMLElement[];
}

interface DeviceMemoryNavigator extends Navigator {
  deviceMemory?: number;
}

export const prefersConservativeEffects = (reducedMotion: boolean): boolean => {
  const memory = (navigator as DeviceMemoryNavigator).deviceMemory;
  return reducedMotion || navigator.hardwareConcurrency <= 4 || (memory !== undefined && memory <= 4);
};

/** 装饰节点每次重播都重新生成，数量固定且克制，不会逐次累积。 */
export class DecorationManager {
  private elements: HTMLElement[] = [];

  build(container: HTMLElement, reducedMotion: boolean): DecorationSet {
    this.clear();
    const conservative = prefersConservativeEffects(reducedMotion);
    const petalCount = conservative ? 3 : 5;
    const fleckCount = conservative ? 2 : 5;
    const butterflyCount = conservative ? 0 : 1;

    const petals = this.createMany(container, 'petal', petalCount);
    const flecks = this.createMany(container, 'gold-fleck', fleckCount);
    const butterflies = this.createMany(container, 'paper-butterfly', butterflyCount);
    this.elements = [...petals, ...flecks, ...butterflies];

    return { petals, flecks, butterflies, all: this.elements };
  }

  clear(): void {
    this.elements.forEach((element) => element.remove());
    this.elements = [];
  }

  private createMany(container: HTMLElement, className: string, count: number): HTMLElement[] {
    return Array.from({ length: count }, (_, index) => {
      const element = document.createElement('span');
      element.className = `decoration ${className} ${className}--${index + 1}`;
      element.setAttribute('aria-hidden', 'true');
      container.append(element);
      return element;
    });
  }
}
