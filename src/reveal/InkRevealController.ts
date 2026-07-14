interface Point {
  x: number;
  y: number;
}

interface NormalizedStamp {
  x: number;
  y: number;
  radius: number;
}

interface RevealOptions {
  canvas: HTMLCanvasElement;
  glow: HTMLElement;
  targets: HTMLElement[];
  threshold: number;
  idleDelayMs: number;
  onComplete: () => void;
  onProgress?: (progress: number) => void;
}

/**
 * Canvas 是盖在真实 DOM 文字上方的信纸色遮罩。通过 destination-out 擦除遮罩，
 * 文字始终保留在 DOM 中，可被选择和辅助技术读取。
 */
export class InkRevealController {
  private readonly canvas: HTMLCanvasElement;
  private readonly glow: HTMLElement;
  private readonly targets: HTMLElement[];
  private readonly threshold: number;
  private readonly idleDelayMs: number;
  private readonly onComplete: () => void;
  private readonly onProgress?: (progress: number) => void;
  private context: CanvasRenderingContext2D | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private cssWidth = 0;
  private cssHeight = 0;
  private dpr = 1;
  private brushRadius = 54;
  private gridColumns = 34;
  private gridRows = 1;
  private eligible = new Uint8Array();
  private visited = new Uint8Array();
  private eligibleCount = 0;
  private visitedCount = 0;
  private maximumProgress = 0;
  private stamps: NormalizedStamp[] = [];
  private pending: Point[] = [];
  private lastPoint: Point | null = null;
  private pointerId: number | null = null;
  private frame = 0;
  private idleTimer = 0;
  private idleClearTimer = 0;
  private active = false;
  private locked = true;
  private completed = false;
  private hidden = false;
  private rect: DOMRect | null = null;

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.active || this.locked || this.pointerId !== null) return;
    event.preventDefault();
    this.pointerId = event.pointerId;
    try {
      this.canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // 某些辅助技术或合成 PointerEvent 不具备原生捕获状态，仍可继续显影。
    }
    const point = this.toLocalPoint(event);
    this.lastPoint = point;
    this.queuePoint(point);
    this.moveGlow(point);
    this.resetIdleTimer();
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.active || this.locked) return;
    const point = this.toLocalPoint(event);
    this.moveGlow(point);

    if (this.pointerId !== event.pointerId || !this.lastPoint) return;
    event.preventDefault();
    const coalesced = event.getCoalescedEvents?.();
    const samples = coalesced && coalesced.length > 0 ? coalesced : [event];
    samples.forEach((sample) => {
      const next = this.toLocalPoint(sample);
      this.queueInterpolated(this.lastPoint ?? next, next);
      this.lastPoint = next;
    });
    this.resetIdleTimer();
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (this.pointerId !== event.pointerId) return;
    try {
      if (this.canvas.hasPointerCapture?.(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      // 捕获已被浏览器释放时无需再次处理。
    }
    this.pointerId = null;
    this.lastPoint = null;
    this.resetIdleTimer();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.active || this.locked || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    this.completeImmediately();
  };

  constructor(options: RevealOptions) {
    this.canvas = options.canvas;
    this.glow = options.glow;
    this.targets = options.targets;
    this.threshold = options.threshold;
    this.idleDelayMs = options.idleDelayMs;
    this.onComplete = options.onComplete;
    this.onProgress = options.onProgress;
    try {
      this.context = this.canvas.getContext('2d', { alpha: true });
    } catch {
      this.context = null;
    }

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerEnd);
    this.canvas.addEventListener('pointercancel', this.onPointerEnd);
    this.canvas.addEventListener('lostpointercapture', this.onPointerEnd);
    this.canvas.addEventListener('keydown', this.onKeyDown);

    const ResizeObserverConstructor: typeof ResizeObserver | undefined = globalThis.ResizeObserver;
    if (ResizeObserverConstructor) {
      this.resizeObserver = new ResizeObserverConstructor(() => this.resize());
      this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);
    } else {
      window.addEventListener('resize', this.resize);
    }
  }

  get isAvailable(): boolean {
    return this.context !== null;
  }

  activate(): boolean {
    this.active = true;
    this.locked = false;
    this.canvas.tabIndex = 0;
    this.canvas.style.removeProperty('pointer-events');
    this.rect = this.canvas.getBoundingClientRect();
    this.resize();
    this.resetIdleTimer();
    return this.isAvailable;
  }

  lock(): void {
    this.locked = true;
    this.canvas.tabIndex = -1;
    this.canvas.style.pointerEvents = 'none';
    this.pointerId = null;
    this.lastPoint = null;
    this.clearIdleTimer();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pending = [];
    this.glow.classList.remove('is-visible', 'is-hinting');
  }

  pause(): void {
    this.hidden = true;
    this.clearIdleTimer();
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    // 丢弃尚未绘制的瞬时采样；已落到 Canvas 和网格中的进度永久保留。
    this.pending = [];
  }

  resume(): void {
    this.hidden = false;
    if (this.active && !this.locked) this.resetIdleTimer();
  }

  reset(): void {
    this.lock();
    this.active = false;
    this.completed = false;
    this.maximumProgress = 0;
    this.stamps = [];
    this.pending = [];
    this.visitedCount = 0;
    this.canvas.tabIndex = -1;
    this.canvas.style.opacity = '1';
    this.glow.removeAttribute('style');
    this.resize();
  }

  destroy(): void {
    this.lock();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerEnd);
    this.canvas.removeEventListener('pointercancel', this.onPointerEnd);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerEnd);
    this.canvas.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly resize = (): void => {
    const rect = this.canvas.parentElement?.getBoundingClientRect() ?? this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.rect = this.canvas.getBoundingClientRect();
    // DPR 最高取 2：高清屏仍清晰，同时避免移动端 Canvas 内存成倍增长。
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.cssWidth * this.dpr);
    this.canvas.height = Math.round(this.cssHeight * this.dpr);
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
    this.brushRadius = Math.max(42, Math.min(68, this.cssWidth * 0.12));

    this.context?.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.rebuildGrid();
    this.repaintMask();
  };

  private rebuildGrid(): void {
    this.gridColumns = this.cssWidth < 380 ? 32 : 38;
    this.gridRows = Math.max(1, Math.round(this.gridColumns * (this.cssHeight / this.cssWidth)));
    const total = this.gridColumns * this.gridRows;
    this.eligible = new Uint8Array(total);
    this.visited = new Uint8Array(total);
    this.eligibleCount = 0;
    this.visitedCount = 0;

    const canvasRect = this.canvas.getBoundingClientRect();
    const targetRects = this.targets.map((target) => target.getBoundingClientRect());
    const cellWidth = this.cssWidth / this.gridColumns;
    const cellHeight = this.cssHeight / this.gridRows;

    for (let row = 0; row < this.gridRows; row += 1) {
      for (let column = 0; column < this.gridColumns; column += 1) {
        const localX = (column + 0.5) * cellWidth;
        const localY = (row + 0.5) * cellHeight;
        const pageX = canvasRect.left + localX;
        const pageY = canvasRect.top + localY;
        const index = row * this.gridColumns + column;
        const isText = targetRects.some(
          (rect) =>
            pageX >= rect.left - 5 &&
            pageX <= rect.right + 5 &&
            pageY >= rect.top - 4 &&
            pageY <= rect.bottom + 4,
        );
        if (isText) {
          this.eligible[index] = 1;
          this.eligibleCount += 1;
        }
      }
    }

    // 尺寸变化后按归一化轨迹重新投射到新网格，进度和视觉都不会丢失。
    this.stamps.forEach((stamp) => {
      this.markGrid(stamp.x * this.cssWidth, stamp.y * this.cssHeight, stamp.radius * this.cssWidth);
    });
  }

  private repaintMask(): void {
    if (!this.context) return;
    const context = this.context;
    context.save();
    context.globalCompositeOperation = 'source-over';
    context.clearRect(0, 0, this.cssWidth, this.cssHeight);
    context.fillStyle = '#F7F1E7';
    context.fillRect(0, 0, this.cssWidth, this.cssHeight);
    context.globalAlpha = 0.12;
    context.fillStyle = '#C3A15D';
    const dotCount = Math.min(130, Math.floor((this.cssWidth * this.cssHeight) / 1800));
    for (let index = 0; index < dotCount; index += 1) {
      const x = ((index * 73) % 997) / 997 * this.cssWidth;
      const y = ((index * 151) % 991) / 991 * this.cssHeight;
      context.fillRect(x, y, 0.55, 0.55);
    }
    context.restore();

    this.stamps.forEach((stamp) => {
      this.drawStamp(stamp.x * this.cssWidth, stamp.y * this.cssHeight, stamp.radius * this.cssWidth, false);
    });
  }

  private toLocalPoint(event: PointerEvent): Point {
    const rect = this.rect ?? this.canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(this.cssWidth, event.clientX - rect.left)),
      y: Math.max(0, Math.min(this.cssHeight, event.clientY - rect.top)),
    };
  }

  /** 快速划动时按笔刷半径的 22% 插值，避免事件采样之间出现断点。 */
  private queueInterpolated(from: Point, to: Point): void {
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const spacing = Math.max(7, this.brushRadius * 0.22);
    const steps = Math.max(1, Math.ceil(distance / spacing));
    for (let step = 1; step <= steps; step += 1) {
      const ratio = step / steps;
      this.queuePoint({
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio,
      });
    }
  }

  private queuePoint(point: Point): void {
    this.pending.push(point);
    if (!this.frame) this.frame = requestAnimationFrame(this.flushPending);
  }

  private readonly flushPending = (): void => {
    this.frame = 0;
    if (this.hidden || this.locked || !this.context) {
      this.pending = [];
      return;
    }

    const points = this.pending.splice(0);
    points.forEach((point) => {
      this.drawStamp(point.x, point.y, this.brushRadius, true);
      if (this.stamps.length < 4000) {
        this.stamps.push({
          x: point.x / this.cssWidth,
          y: point.y / this.cssHeight,
          radius: this.brushRadius / this.cssWidth,
        });
      }
      this.markGrid(point.x, point.y, this.brushRadius * 0.78);
    });

    // 覆盖率只来自低分辨率有效文字网格，不读取 Canvas 像素，也不依赖最后一个字。
    const progress = this.eligibleCount > 0 ? this.visitedCount / this.eligibleCount : 0;
    this.maximumProgress = Math.max(this.maximumProgress, progress);
    this.onProgress?.(this.maximumProgress);
    if (this.maximumProgress >= this.threshold) this.finish();
  };

  private drawStamp(x: number, y: number, radius: number, soft: boolean): void {
    if (!this.context) return;
    const context = this.context;
    context.save();
    context.globalCompositeOperation = 'destination-out';
    if (soft) {
      const gradient = context.createRadialGradient(x, y, radius * 0.18, x, y, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.66, 'rgba(0,0,0,0.92)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      context.fillStyle = gradient;
    } else {
      context.fillStyle = 'rgba(0,0,0,0.94)';
    }
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  private markGrid(x: number, y: number, radius: number): void {
    const cellWidth = this.cssWidth / this.gridColumns;
    const cellHeight = this.cssHeight / this.gridRows;
    const minColumn = Math.max(0, Math.floor((x - radius) / cellWidth));
    const maxColumn = Math.min(this.gridColumns - 1, Math.ceil((x + radius) / cellWidth));
    const minRow = Math.max(0, Math.floor((y - radius) / cellHeight));
    const maxRow = Math.min(this.gridRows - 1, Math.ceil((y + radius) / cellHeight));

    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const index = row * this.gridColumns + column;
        if (!this.eligible[index] || this.visited[index]) continue;
        const centerX = (column + 0.5) * cellWidth;
        const centerY = (row + 0.5) * cellHeight;
        if (Math.hypot(centerX - x, centerY - y) <= radius) {
          this.visited[index] = 1;
          this.visitedCount += 1;
        }
      }
    }
  }

  private moveGlow(point: Point): void {
    this.glow.classList.add('is-visible');
    this.glow.classList.remove('is-hinting');
    this.glow.style.transform = `translate3d(${point.x}px, ${point.y}px, 0)`;
  }

  private resetIdleTimer(): void {
    this.clearIdleTimer();
    if (!this.active || this.locked || this.hidden) return;
    this.idleTimer = window.setTimeout(() => this.showIdleHint(), this.idleDelayMs);
  }

  private clearIdleTimer(): void {
    window.clearTimeout(this.idleTimer);
    window.clearTimeout(this.idleClearTimer);
    this.idleTimer = 0;
    this.idleClearTimer = 0;
    this.glow.classList.remove('is-hinting');
  }

  private showIdleHint(): void {
    const index = this.eligible.findIndex((value, cellIndex) => value === 1 && this.visited[cellIndex] === 0);
    if (index < 0) return;
    const column = index % this.gridColumns;
    const row = Math.floor(index / this.gridColumns);
    const point = {
      x: ((column + 0.5) / this.gridColumns) * this.cssWidth,
      y: ((row + 0.5) / this.gridRows) * this.cssHeight,
    };
    this.moveGlow(point);
    this.glow.classList.add('is-hinting');
    this.idleClearTimer = window.setTimeout(() => {
      this.glow.classList.remove('is-hinting');
      this.resetIdleTimer();
    }, 1800);
  }

  private completeImmediately(): void {
    if (this.completed) return;
    this.maximumProgress = 1;
    this.finish();
  }

  private finish(): void {
    if (this.completed) return;
    this.completed = true;
    this.lock();
    this.onComplete();
  }
}
