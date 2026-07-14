export interface AppElements {
  experience: HTMLElement;
  cardStage: HTMLElement;
  cardFloat: HTMLElement;
  cardBook: HTMLElement;
  pageLeft: HTMLElement;
  pageRight: HTMLElement;
  waxSeal: HTMLButtonElement;
  letterSheet: HTMLElement;
  letterPaper: HTMLElement;
  paperOrnaments: HTMLElement;
  letterCopyWrap: HTMLElement;
  letterCopy: HTMLElement;
  birthdayLine: HTMLElement;
  revealTargets: HTMLElement[];
  revealCanvas: HTMLCanvasElement;
  revealGlow: HTMLElement;
  finaleContent: HTMLElement;
  finaleTitle: HTMLElement;
  stageHint: HTMLElement;
  continueButton: HTMLButtonElement;
  replayButton: HTMLButtonElement;
  soundButton: HTMLButtonElement;
  soundLabel: HTMLElement;
  srStatus: HTMLElement;
  botanicalShadows: HTMLElement[];
}

const find = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`缺少页面元素：${selector}`);
  return element;
};

export const collectElements = (root: ParentNode): AppElements => ({
  experience: find(root, '[data-experience]'),
  cardStage: find(root, '[data-card-stage]'),
  cardFloat: find(root, '[data-card-float]'),
  cardBook: find(root, '[data-card-book]'),
  pageLeft: find(root, '[data-page-left]'),
  pageRight: find(root, '[data-page-right]'),
  waxSeal: find(root, '[data-wax-seal]'),
  letterSheet: find(root, '[data-letter-sheet]'),
  letterPaper: find(root, '[data-letter-paper]'),
  paperOrnaments: find(root, '[data-paper-ornaments]'),
  letterCopyWrap: find(root, '[data-letter-copy-wrap]'),
  letterCopy: find(root, '[data-letter-copy]'),
  birthdayLine: find(root, '[data-birthday-line]'),
  revealTargets: Array.from(root.querySelectorAll<HTMLElement>('.reveal-target')),
  revealCanvas: find(root, '[data-reveal-canvas]'),
  revealGlow: find(root, '[data-reveal-glow]'),
  finaleContent: find(root, '[data-finale-content]'),
  finaleTitle: find(root, '[data-finale-title]'),
  stageHint: find(root, '[data-stage-hint]'),
  continueButton: find(root, '[data-continue]'),
  replayButton: find(root, '[data-replay]'),
  soundButton: find(root, '[data-sound-toggle]'),
  soundLabel: find(root, '[data-sound-label]'),
  srStatus: find(root, '[data-sr-status]'),
  botanicalShadows: Array.from(root.querySelectorAll<HTMLElement>('.botanical-shadow')),
});
