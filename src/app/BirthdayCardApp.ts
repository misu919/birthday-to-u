import { gsap } from 'gsap';
import { CeremonyTimeline } from '../animation/CeremonyTimeline';
import { SoundController } from '../audio/SoundController';
import { cardContent, experience, theme } from '../config/content';
import { collectElements, type AppElements } from '../dom/elements';
import { createTemplate } from '../dom/template';
import { DecorationManager, type DecorationSet } from '../effects/DecorationManager';
import { TiltController } from '../interaction/TiltController';
import { InkRevealController } from '../reveal/InkRevealController';
import { CardState, type CardPhase } from '../state/CardState';

export class BirthdayCardApp {
  private readonly state = new CardState();
  private readonly sound = new SoundController();
  private readonly decorations = new DecorationManager();
  private readonly motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly abortController = new AbortController();
  private readonly elements: AppElements;
  private readonly reveal: InkRevealController;
  private readonly tilt: TiltController;
  private readonly ceremony: CeremonyTimeline;
  private decorationSet: DecorationSet;
  private fallbackCompletion: ReturnType<typeof gsap.to> | null = null;
  private runId = 0;

  constructor(private readonly root: HTMLElement) {
    document.title = cardContent.documentTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', cardContent.documentDescription);
    this.root.innerHTML = createTemplate();
    this.elements = collectElements(root);
    this.applyTheme();
    this.elements.experience.classList.toggle('reduce-motion', this.motionQuery.matches);

    this.decorationSet = this.decorations.build(this.elements.cardBook, this.motionQuery.matches);
    this.reveal = new InkRevealController({
      canvas: this.elements.revealCanvas,
      glow: this.elements.revealGlow,
      targets: this.elements.revealTargets,
      threshold: experience.revealThreshold,
      idleDelayMs: experience.idleHintDelayMs,
      onComplete: () => this.finishReveal(),
      onProgress: (progress) => {
        this.elements.experience.style.setProperty('--reveal-progress', progress.toFixed(3));
      },
    });
    this.tilt = new TiltController(
      this.elements.cardBook,
      experience.maxTiltDegrees,
      () => this.motionQuery.matches,
    );
    this.ceremony = new CeremonyTimeline(this.elements, {
      onWaxSound: () => this.sound.play('wax'),
      onPaperSound: () => undefined,
      onFinaleSound: () => undefined,
      onRevealReady: () => this.startReveal(),
      onReadingReady: () => this.showContinueControl(),
      onFinaleStart: () => this.startFinale(),
      onFinaleComplete: () => this.completeFinale(),
    });

    this.state.subscribe((phase) => this.renderPhase(phase));
    this.bindEvents();
    this.prepareRun();
  }

  destroy(): void {
    this.abortController.abort();
    this.fallbackCompletion?.kill();
    this.ceremony.kill();
    this.reveal.destroy();
    this.tilt.destroy();
    this.decorations.clear();
    this.sound.destroy();
  }

  private bindEvents(): void {
    const signal = this.abortController.signal;
    this.elements.waxSeal.addEventListener('click', () => this.open(), { signal });
    this.elements.continueButton.addEventListener('click', () => this.continueToFinale(), { signal });
    this.elements.replayButton.addEventListener('click', () => this.reset(), { signal });
    this.elements.soundButton.addEventListener('click', () => void this.toggleSound(), { signal });
    document.addEventListener('keydown', (event) => this.onDocumentKeyDown(event), { signal });
    document.addEventListener('visibilitychange', () => this.onVisibilityChange(), { signal });
    window.addEventListener('beforeunload', () => this.destroy(), { signal, once: true });
    this.motionQuery.addEventListener('change', () => this.onMotionPreferenceChange(), { signal });
  }

  private prepareRun(): void {
    this.runId += 1;
    this.fallbackCompletion?.kill();
    this.fallbackCompletion = null;
    this.reveal.reset();
    this.decorationSet = this.decorations.build(this.elements.cardBook, this.motionQuery.matches);
    this.ceremony.rebuild(this.decorationSet, this.motionQuery.matches);
    this.elements.finaleContent.setAttribute('aria-hidden', 'true');
    this.elements.experience.style.setProperty('--reveal-progress', '0');
    this.elements.stageHint.textContent = cardContent.hints.sealed;
    this.elements.stageHint.removeAttribute('style');
    this.elements.waxSeal.disabled = false;
    this.elements.continueButton.disabled = true;
    this.elements.continueButton.setAttribute('aria-hidden', 'true');
    this.elements.replayButton.disabled = true;
    this.elements.replayButton.setAttribute('aria-hidden', 'true');
    this.elements.srStatus.textContent = '';
    this.renderPhase('sealed');
    this.renderSoundButton();
    this.tilt.start();
  }

  private open(): void {
    if (!this.state.advance('sealed')) return;
    void this.sound.unlockFromGesture();
    this.elements.waxSeal.disabled = true;
    this.tilt.stop();
    this.ceremony.playOpening();
  }

  private startReveal(): void {
    if (!this.state.advance('opening')) return;
    this.elements.stageHint.textContent = cardContent.hints.revealing;
    this.elements.srStatus.textContent = cardContent.accessibility.openedStatus;
    const available = this.reveal.activate();
    if (available) {
      this.elements.revealCanvas.focus({ preventScroll: true });
    } else {
      const currentRun = this.runId;
      gsap.set(this.elements.letterCopy, { opacity: 0 });
      this.elements.revealCanvas.style.display = 'none';
      this.fallbackCompletion = gsap.to(this.elements.letterCopy, {
        opacity: 1,
        duration: this.motionQuery.matches ? 0.16 : 0.68,
        ease: 'sine.inOut',
        onComplete: () => {
          if (currentRun === this.runId) this.finishReveal();
        },
      });
    }
  }

  private finishReveal(): void {
    if (!this.state.advance('revealing')) return;
    this.reveal.lock();
    this.elements.srStatus.textContent = cardContent.accessibility.completingStatus;
    this.ceremony.playCompletion();
  }

  private showContinueControl(): void {
    if (this.state.value !== 'completing') return;
    this.elements.continueButton.disabled = false;
    this.elements.continueButton.setAttribute('aria-hidden', 'false');
    this.elements.continueButton.style.pointerEvents = 'auto';
    this.elements.srStatus.textContent = cardContent.accessibility.readingReadyStatus;
    this.elements.continueButton.focus({ preventScroll: true });
  }

  private continueToFinale(): void {
    if (this.state.value !== 'completing' || this.elements.continueButton.disabled) return;
    this.elements.continueButton.disabled = true;
    this.elements.continueButton.style.pointerEvents = 'none';
    this.elements.continueButton.blur();
    this.ceremony.playFinale();
  }

  private startFinale(): void {
    if (!this.state.advance('completing')) return;
    this.elements.continueButton.setAttribute('aria-hidden', 'true');
    this.elements.finaleContent.setAttribute('aria-hidden', 'false');
    this.elements.srStatus.textContent = `${cardContent.finale.title}。${cardContent.finale.wishes.join('')}`;
  }

  private completeFinale(): void {
    if (this.state.value !== 'finale') return;
    this.elements.replayButton.disabled = false;
    this.elements.replayButton.setAttribute('aria-hidden', 'false');
    this.elements.replayButton.focus({ preventScroll: true });
  }

  /** 再次阅读不刷新页面：清空旧时间轴、遮罩、装饰和内联状态后创建全新一次运行。 */
  private reset(): void {
    if (this.state.value !== 'finale') return;
    this.fallbackCompletion?.kill();
    this.sound.stopAll();
    this.ceremony.kill();
    this.tilt.stop();
    this.decorations.clear();
    this.elements.revealCanvas.style.removeProperty('display');
    this.state.reset();
    this.prepareRun();
    this.elements.waxSeal.focus({ preventScroll: true });
  }

  private async toggleSound(): Promise<void> {
    await this.sound.toggleFromGesture();
    this.renderSoundButton();
  }

  private renderSoundButton(): void {
    const muted = this.sound.isMuted;
    this.elements.soundButton.setAttribute('aria-pressed', String(!muted));
    this.elements.soundButton.setAttribute(
      'aria-label',
      muted ? cardContent.controls.soundOffAria : cardContent.controls.soundOnAria,
    );
    this.elements.soundButton.classList.toggle('is-sound-on', !muted);
    this.elements.soundLabel.textContent = muted ? cardContent.controls.soundOff : cardContent.controls.soundOn;
  }

  private renderPhase(phase: CardPhase): void {
    this.elements.experience.classList.remove(
      'phase-sealed',
      'phase-opening',
      'phase-revealing',
      'phase-completing',
      'phase-finale',
    );
    this.elements.experience.classList.add(`phase-${phase}`);
    this.elements.experience.dataset.phase = phase;
  }

  private onDocumentKeyDown(event: KeyboardEvent): void {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    const target = event.target;
    let interactive: Element | null = null;
    if (target instanceof HTMLElement) {
      interactive = target.closest('button, a, input, textarea, select, [contenteditable="true"]');
    }

    if (this.state.value === 'sealed') {
      if (interactive && interactive !== this.elements.waxSeal) return;
      event.preventDefault();
      this.open();
      return;
    }

    if (this.state.value === 'completing' && !this.elements.continueButton.disabled) {
      // 按钮聚焦时交给原生键盘点击；正文区域则提供 Enter / 空格兜底。
      if (interactive === this.elements.continueButton) return;
      if (interactive) return;
      event.preventDefault();
      this.continueToFinale();
    }
  }

  private onVisibilityChange(): void {
    const hidden = document.hidden;
    this.elements.experience.classList.toggle('is-page-hidden', hidden);
    if (hidden) {
      this.ceremony.pauseForVisibility();
      this.reveal.pause();
      void this.sound.pauseForVisibility();
    } else {
      this.ceremony.resumeForVisibility();
      this.reveal.resume();
      void this.sound.resumeForVisibility();
    }
  }

  private onMotionPreferenceChange(): void {
    this.elements.experience.classList.toggle('reduce-motion', this.motionQuery.matches);
    if (this.state.value === 'sealed') {
      // 封存阶段可以无感重建，让新偏好立即作用于下一次完整主时间轴。
      this.tilt.stop();
      this.prepareRun();
      return;
    }
    if (this.motionQuery.matches) this.tilt.stop();
  }

  private applyTheme(): void {
    const style = this.elements.experience.style;
    style.setProperty('--color-background', theme.background);
    style.setProperty('--color-cover', theme.cover);
    style.setProperty('--color-rose', theme.rose);
    style.setProperty('--color-gold', theme.gold);
    style.setProperty('--color-paper', theme.paper);
    style.setProperty('--color-ink', theme.ink);
  }
}
