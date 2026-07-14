import { gsap } from 'gsap';
import type { DecorationSet } from '../effects/DecorationManager';
import type { AppElements } from '../dom/elements';

interface CeremonyCallbacks {
  onWaxSound: () => void;
  onPaperSound: () => void;
  onFinaleSound: () => void;
  onRevealReady: () => void;
  onReadingReady: () => void;
  onFinaleStart: () => void;
  onFinaleComplete: () => void;
}

/**
 * 开封、翻页、补全、终章都编排在同一条主时间轴中。
 * 显影阶段由 addPause 暂停，覆盖率达标后从 completion 标签继续。
 */
export class CeremonyTimeline {
  private master: ReturnType<typeof gsap.timeline> | null = null;
  private resumeAfterVisibility = false;

  constructor(
    private readonly elements: AppElements,
    private readonly callbacks: CeremonyCallbacks,
  ) {}

  rebuild(decorations: DecorationSet, reducedMotion: boolean): void {
    this.kill();
    const element = this.elements;
    const duration = (seconds: number): number =>
      reducedMotion ? Math.max(0.12, seconds * 0.24) : seconds;
    const crackPaths = Array.from(element.waxSeal.querySelectorAll<SVGPathElement>('.wax-cracks path'));
    const fragments = Array.from(element.waxSeal.querySelectorAll<HTMLElement>('.wax-fragment'));
    const waxBase = element.waxSeal.querySelector<HTMLElement>('.wax-base');
    const waxMonogram = element.waxSeal.querySelector<HTMLElement>('.wax-monogram');
    const shellParts = [
      element.pageLeft,
      element.pageRight,
      ...Array.from(element.cardBook.querySelectorAll<HTMLElement>('.card-depth, .card-inner')),
    ];
    const fadeTargets = element.revealTargets.filter((target) => target !== element.birthdayLine);
    const finaleLines = Array.from(element.finaleContent.querySelectorAll<HTMLElement>('.finale-line'));
    const finaleFooter = element.finaleContent.querySelector<HTMLElement>('.finale-footer');

    gsap.set(element.pageLeft, { rotateY: 0, autoAlpha: 1, boxShadow: '10px 13px 24px rgba(48, 31, 36, .24)' });
    gsap.set(element.pageRight, { rotateY: 0, autoAlpha: 1, boxShadow: '-10px 13px 24px rgba(48, 31, 36, .24)' });
    gsap.set(element.letterSheet, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 78,
      scale: 0.78,
      rotateZ: -1.4,
      autoAlpha: 0,
    });
    gsap.set(element.letterCopy, { y: 0, opacity: 1 });
    gsap.set(element.letterPaper, { opacity: 1 });
    gsap.set(element.paperOrnaments, { opacity: 1 });
    gsap.set(element.revealTargets, { x: 0, y: 0, scale: 1, opacity: 1 });
    gsap.set(element.birthdayLine, { x: 0, y: 0, scale: 1, opacity: 1, transformOrigin: 'left center' });
    gsap.set(element.revealCanvas, { opacity: 1 });
    gsap.set(element.finaleContent, { opacity: 1 });
    gsap.set(element.finaleTitle, { opacity: 0, y: 7 });
    gsap.set([...finaleLines, ...(finaleFooter ? [finaleFooter] : [])], { opacity: 0, y: 10 });
    gsap.set(element.botanicalShadows, { opacity: 0, scale: 0.96 });
    gsap.set(element.continueButton, { autoAlpha: 0, y: 8, pointerEvents: 'none' });
    gsap.set(element.replayButton, { opacity: 0, y: 8, pointerEvents: 'none' });
    gsap.set(shellParts, { opacity: 1, filter: 'blur(0px)' });
    gsap.set(element.waxSeal, { autoAlpha: 1, scale: 1, rotate: 0, pointerEvents: 'auto' });
    gsap.set([waxBase, waxMonogram, ...fragments], { opacity: 1 });
    gsap.set(crackPaths, { opacity: 0, strokeDashoffset: 1 });
    gsap.set(decorations.all, { opacity: 0, x: 0, y: 0, scale: 0.3, rotate: 0 });

    const timeline = gsap.timeline({
      paused: true,
      defaults: { ease: 'power2.inOut' },
    });
    this.master = timeline;

    timeline.addLabel('opening', 0);
    timeline.to(element.stageHint, { opacity: 0, y: 5, duration: duration(0.35), ease: 'sine.inOut' }, 0);
    timeline.to(element.waxSeal, { scale: 0.92, y: 2, duration: duration(0.18), ease: 'power2.in' }, 0);
    timeline.call(this.callbacks.onWaxSound, [], duration(0.13));
    timeline.to(
      crackPaths,
      { opacity: 0.9, strokeDashoffset: 0, duration: duration(0.38), stagger: duration(0.035), ease: 'power2.out' },
      duration(0.2),
    );
    timeline.to(element.waxSeal, { scale: 1, y: 0, duration: duration(0.24), ease: 'power2.out' }, duration(0.38));
    timeline.to([waxBase, waxMonogram], { opacity: 0.18, duration: duration(0.3) }, duration(0.5));
    timeline.to(
      fragments,
      {
        x: (index) => [-12, 13, 4][index] ?? 0,
        y: (index) => [9, 7, 17][index] ?? 10,
        rotate: (index) => [-7, 8, 3][index] ?? 0,
        opacity: 0,
        duration: duration(0.52),
        stagger: duration(0.035),
        ease: 'power2.inOut',
      },
      duration(0.52),
    );
    timeline.to(element.waxSeal, { autoAlpha: 0, duration: duration(0.28), pointerEvents: 'none' }, duration(0.84));

    timeline.call(this.callbacks.onPaperSound, [], duration(0.66));
    timeline.to(
      element.pageLeft,
      {
        rotateY: -148,
        boxShadow: '3px 18px 35px rgba(48, 31, 36, .12)',
        duration: duration(1.8),
        ease: 'power2.inOut',
      },
      duration(0.72),
    );
    timeline.to(
      element.pageRight,
      {
        rotateY: 148,
        boxShadow: '-3px 18px 35px rgba(48, 31, 36, .12)',
        duration: duration(1.8),
        ease: 'power2.inOut',
      },
      duration(0.79),
    );
    timeline.to(
      element.letterSheet,
      { autoAlpha: 1, y: 34, scale: 0.87, rotateZ: -0.8, duration: duration(0.82), ease: 'power3.out' },
      duration(1.02),
    );

    if (!reducedMotion) this.addDecorationMotion(timeline, decorations, duration);

    timeline.to(
      element.letterSheet,
      { y: 0, scale: 1, rotateZ: 0, duration: duration(1.2), ease: 'power3.out' },
      duration(2.22),
    );
    timeline.to(
      shellParts,
      { opacity: 0.08, y: 22, duration: duration(0.9), ease: 'sine.inOut' },
      duration(2.65),
    );
    timeline.call(this.callbacks.onRevealReady, [], duration(3.35));
    timeline.to(element.stageHint, { opacity: 1, y: 0, duration: duration(0.45), ease: 'sine.inOut' }, duration(3.38));
    timeline.addPause('revealHold');
    timeline.addLabel('completion', 'revealHold+=0.02');

    timeline.to(
      element.revealCanvas,
      { opacity: 0, duration: duration(1.5), ease: 'sine.inOut' },
      'completion',
    );
    timeline.to(
      element.letterCopy,
      { y: -10, duration: duration(1.2), ease: 'sine.inOut' },
      'completion+=0.18',
    );
    timeline.to(element.stageHint, { opacity: 0, y: 5, duration: duration(0.5) }, 'completion');
    timeline.to(
      element.continueButton,
      { autoAlpha: 1, y: 0, duration: duration(0.42), ease: 'sine.inOut' },
      `completion+=${duration(0.98)}`,
    );
    timeline.addLabel('readingHold', `completion+=${duration(1.52)}`);
    timeline.addPause('readingHold', this.callbacks.onReadingReady);
    timeline.addLabel('finale', `readingHold+=${duration(0.02)}`);
    timeline.call(this.callbacks.onFinaleStart, [], 'finale');
    timeline.call(this.callbacks.onFinaleSound, [], `finale+=${duration(0.12)}`);
    timeline.to(
      element.continueButton,
      { autoAlpha: 0, y: -5, pointerEvents: 'none', duration: duration(0.32), ease: 'sine.inOut' },
      'finale',
    );
    timeline.to(
      fadeTargets,
      { opacity: 0.025, y: -8, duration: duration(0.78), stagger: duration(0.025), ease: 'sine.inOut' },
      'finale',
    );
    timeline.to(
      shellParts,
      { opacity: 0, filter: 'blur(2px)', duration: duration(0.92), ease: 'sine.inOut' },
      'finale',
    );
    timeline.to(element.paperOrnaments, { opacity: 0.24, duration: duration(1.05) }, 'finale');
    timeline.to(element.letterPaper, { opacity: 0.72, duration: duration(1.1) }, 'finale');
    timeline.to(
      element.botanicalShadows,
      { opacity: 0.3, scale: 1, duration: duration(1.45), stagger: duration(0.16), ease: 'sine.inOut' },
      'finale',
    );
    // 终章保持自动播放，但用“移动—停留—换题”三拍拉开两次“生日快乐”的呼吸感。
    timeline.to(
      element.birthdayLine,
      {
        x: () => this.titleOffset().x,
        y: () => this.titleOffset().y,
        scale: reducedMotion ? 1.15 : 1.42,
        duration: duration(1.45),
        ease: 'power2.inOut',
      },
      `finale+=${duration(0.28)}`,
    );
    timeline.to(
      element.birthdayLine,
      { opacity: 0, duration: duration(0.38), ease: 'sine.inOut' },
      `finale+=${duration(2.16)}`,
    );
    timeline.to(
      element.finaleTitle,
      { opacity: 1, y: 0, duration: duration(0.58), ease: 'sine.inOut' },
      `finale+=${duration(2.8)}`,
    );
    timeline.to(
      finaleLines,
      { opacity: 1, y: 0, duration: duration(0.5), stagger: duration(0.22), ease: 'power3.out' },
      `finale+=${duration(3.46)}`,
    );
    if (finaleFooter) {
      timeline.to(
        finaleFooter,
        { opacity: 1, y: 0, duration: duration(0.48), ease: 'sine.inOut' },
        `finale+=${duration(4.18)}`,
      );
    }
    timeline.to(
      element.replayButton,
      { opacity: 1, y: 0, pointerEvents: 'auto', duration: duration(0.52), ease: 'sine.inOut' },
      `finale+=${duration(4.38)}`,
    );
    timeline.call(this.callbacks.onFinaleComplete, [], `finale+=${duration(4.92)}`);
  }

  playOpening(): void {
    this.master?.play('opening');
  }

  playCompletion(): void {
    this.master?.play('completion');
  }

  playFinale(): void {
    this.master?.play();
  }

  pauseForVisibility(): void {
    this.resumeAfterVisibility = Boolean(this.master?.isActive());
    if (this.resumeAfterVisibility) this.master?.pause();
  }

  resumeForVisibility(): void {
    if (this.resumeAfterVisibility) this.master?.resume();
    this.resumeAfterVisibility = false;
  }

  kill(): void {
    this.master?.kill();
    this.master = null;
    this.resumeAfterVisibility = false;
  }

  private titleOffset(): { x: number; y: number } {
    const source = this.elements.birthdayLine.getBoundingClientRect();
    const target = this.elements.finaleTitle.getBoundingClientRect();
    return {
      x: target.left + target.width / 2 - (source.left + source.width / 2),
      y: target.top + target.height / 2 - (source.top + source.height / 2),
    };
  }

  private addDecorationMotion(
    timeline: ReturnType<typeof gsap.timeline>,
    decorations: DecorationSet,
    duration: (seconds: number) => number,
  ): void {
    const petalEnds = [
      { x: -220, y: 48, rotate: -88 },
      { x: -126, y: -118, rotate: 62 },
      { x: 174, y: -96, rotate: 110 },
      { x: 226, y: 46, rotate: 76 },
      { x: 82, y: 138, rotate: 145 },
    ];
    const fleckEnds = [
      { x: -176, y: -52 },
      { x: -92, y: 124 },
      { x: 34, y: -132 },
      { x: 152, y: 112 },
      { x: 205, y: -38 },
    ];

    decorations.petals.forEach((petal, index) => {
      const end = petalEnds[index] ?? petalEnds[0];
      timeline.to(
        petal,
        { opacity: 0.76, scale: 1, x: end.x, y: end.y, rotate: end.rotate, duration: duration(1.35), ease: 'power3.out' },
        duration(1.2 + index * 0.07),
      );
      timeline.to(petal, { opacity: 0, y: end.y + 18, duration: duration(0.7) }, duration(2.38));
    });
    decorations.flecks.forEach((fleck, index) => {
      const end = fleckEnds[index] ?? fleckEnds[0];
      timeline.to(
        fleck,
        { opacity: 0.68, scale: 1, x: end.x, y: end.y, rotate: 40 + index * 24, duration: duration(1.05), ease: 'power3.out' },
        duration(1.36 + index * 0.055),
      );
      timeline.to(fleck, { opacity: 0, duration: duration(0.55) }, duration(2.34));
    });
    decorations.butterflies.forEach((butterfly) => {
      timeline.to(
        butterfly,
        { opacity: 0.62, scale: 1, x: 205, y: -132, rotate: 14, duration: duration(1.55), ease: 'power2.out' },
        duration(1.26),
      );
      timeline.to(butterfly, { opacity: 0, y: -148, duration: duration(0.62) }, duration(2.48));
    });
  }
}
