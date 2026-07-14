import { gsap } from 'gsap';

/** 鼠标倾斜只作用于独立外层，避免覆盖翻页和漂浮各自的 transform。 */
export class TiltController {
  private frame = 0;
  private active = false;
  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.active || event.pointerType !== 'mouse') return;
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      gsap.to(this.target, {
        rotateY: x * this.maxDegrees,
        rotateX: y * -this.maxDegrees,
        duration: 0.75,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  };

  private readonly onPointerLeave = (): void => this.center();

  constructor(
    private readonly target: HTMLElement,
    private readonly maxDegrees: number,
    private readonly reducedMotion: () => boolean,
  ) {}

  start(): void {
    if (this.active || this.reducedMotion() || matchMedia('(pointer: coarse)').matches) return;
    this.active = true;
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onPointerLeave);
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('pointermove', this.onPointerMove);
    document.documentElement.removeEventListener('pointerleave', this.onPointerLeave);
    cancelAnimationFrame(this.frame);
    this.center();
  }

  destroy(): void {
    this.stop();
    gsap.killTweensOf(this.target);
  }

  private center(): void {
    gsap.to(this.target, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.85,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }
}
