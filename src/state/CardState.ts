export type CardPhase = 'sealed' | 'opening' | 'revealing' | 'completing' | 'finale';

const nextPhase: Record<CardPhase, CardPhase | null> = {
  sealed: 'opening',
  opening: 'revealing',
  revealing: 'completing',
  completing: 'finale',
  finale: null,
};

type PhaseListener = (phase: CardPhase, previous: CardPhase) => void;

/** 单向状态机：所有流程锁定都以阶段为准，避免散落的布尔变量互相冲突。 */
export class CardState {
  private currentPhase: CardPhase = 'sealed';
  private readonly listeners = new Set<PhaseListener>();

  get value(): CardPhase {
    return this.currentPhase;
  }

  advance(expected: CardPhase): boolean {
    if (this.currentPhase !== expected) return false;
    const next = nextPhase[this.currentPhase];
    if (!next) return false;

    const previous = this.currentPhase;
    this.currentPhase = next;
    this.listeners.forEach((listener) => listener(next, previous));
    return true;
  }

  reset(): void {
    const previous = this.currentPhase;
    this.currentPhase = 'sealed';
    this.listeners.forEach((listener) => listener('sealed', previous));
  }

  subscribe(listener: PhaseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
