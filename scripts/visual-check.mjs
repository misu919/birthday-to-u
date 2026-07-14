import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const baseUrl = process.env.CARD_URL || 'http://127.0.0.1:4173';
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputDirectory = 'artifacts';
await mkdir(outputDirectory, { recursive: true });

const previewServer = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { cwd: process.cwd(), stdio: 'ignore', windowsHide: true },
);
process.once('exit', () => previewServer.kill());

let serverReady = false;
for (let attempt = 0; attempt < 30; attempt += 1) {
  try {
    const response = await fetch(baseUrl);
    if (response.ok) {
      serverReady = true;
      break;
    }
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
if (!serverReady) throw new Error('Preview server did not start');

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--disable-gpu'],
});

const results = [];

const waitForPhase = async (page, phase) => {
  await page.waitForFunction(
    (expected) => document.querySelector('[data-experience]')?.dataset.phase === expected,
    phase,
    { timeout: 12_000 },
  );
};
const waitForReadingHold = async (page, label, holdMs = 2000) => {
  await waitForPhase(page, 'completing');
  await page.waitForFunction(
    () => {
      const experience = document.querySelector('[data-experience]');
      const button = document.querySelector('[data-continue]');
      if (!(button instanceof HTMLButtonElement)) return false;
      const style = getComputedStyle(button);
      return (
        experience?.dataset.phase === 'completing' &&
        !button.disabled &&
        button.getAttribute('aria-hidden') === 'false' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity) > 0.9 &&
        style.pointerEvents !== 'none'
      );
    },
    undefined,
    { timeout: 12_000 },
  );

  await page.waitForTimeout(holdMs);
  const readingState = await page.evaluate(() => {
    const experience = document.querySelector('[data-experience]');
    const button = document.querySelector('[data-continue]');
    const canvas = document.querySelector('[data-reveal-canvas]');
    if (!(button instanceof HTMLButtonElement) || !(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Reading controls are missing');
    }
    const buttonStyle = getComputedStyle(button);
    const canvasStyle = getComputedStyle(canvas);
    const rect = button.getBoundingClientRect();
    return {
      phase: experience?.dataset.phase,
      disabled: button.disabled,
      ariaHidden: button.getAttribute('aria-hidden'),
      visibility: buttonStyle.visibility,
      opacity: Number(buttonStyle.opacity),
      pointerEvents: buttonStyle.pointerEvents,
      width: rect.width,
      height: rect.height,
      focused: document.activeElement === button,
      canvasPointerEvents: canvasStyle.pointerEvents,
      canvasTabIndex: canvas.tabIndex,
    };
  });

  if (readingState.phase !== 'completing') {
    throw new Error(`${label}: reading view advanced automatically`);
  }
  if (
    readingState.disabled ||
    readingState.ariaHidden !== 'false' ||
    readingState.visibility === 'hidden' ||
    readingState.opacity < 0.9 ||
    readingState.pointerEvents === 'none'
  ) {
    throw new Error(`${label}: continue control is not available`);
  }
  if (readingState.width < 44 || readingState.height < 44) {
    throw new Error(`${label}: continue control is smaller than 44x44`);
  }
  if (!readingState.focused) throw new Error(`${label}: continue control did not receive focus`);
  if (readingState.canvasPointerEvents !== 'none' || readingState.canvasTabIndex !== -1) {
    throw new Error(`${label}: completed reveal canvas still intercepts reading input`);
  }

  return readingState;
};
const waitForFinaleReady = async (page, label, verifyPacing = true) => {
  await waitForPhase(page, 'finale');

  if (verifyPacing) {
    await page.waitForTimeout(1800);
    const pacing = await page.evaluate(() => {
      const birthdayLine = document.querySelector('[data-birthday-line]');
      const finaleTitle = document.querySelector('[data-finale-title]');
      const replayButton = document.querySelector('[data-replay]');
      if (!(replayButton instanceof HTMLButtonElement) || !birthdayLine || !finaleTitle) {
        throw new Error('Finale elements are missing');
      }
      return {
        birthdayOpacity: Number(getComputedStyle(birthdayLine).opacity),
        finaleTitleOpacity: Number(getComputedStyle(finaleTitle).opacity),
        replayDisabled: replayButton.disabled,
      };
    });

    if (
      pacing.birthdayOpacity < 0.7 ||
      pacing.finaleTitleOpacity > 0.12 ||
      !pacing.replayDisabled
    ) {
      throw new Error(`${label}: finale pacing became too fast`);
    }
  }

  await page.waitForFunction(
    () => {
      const replayButton = document.querySelector('[data-replay]');
      if (!(replayButton instanceof HTMLButtonElement)) return false;
      const style = getComputedStyle(replayButton);
      return !replayButton.disabled && style.pointerEvents !== 'none' && Number(style.opacity) > 0.9;
    },
    undefined,
    { timeout: 8_000 },
  );
  await page.waitForTimeout(180);
};

const measure = async (page, label) => {
  const metrics = await page.evaluate(() => {
    const viewport = { width: innerWidth, height: innerHeight };
    const documentElement = document.documentElement;
    const selectors = [
      '[data-card-book]',
      '[data-letter-sheet]',
      '[data-finale-content]',
      '[data-continue]',
      '[data-replay]',
      '[data-sound-toggle]',
      '[data-wax-seal]',
    ];
    const boxes = Object.fromEntries(
      selectors.map((selector) => {
        const element = document.querySelector(selector);
        if (!element) return [selector, null];
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return [
          selector,
          {
            left: Math.round(rect.left * 10) / 10,
            right: Math.round(rect.right * 10) / 10,
            top: Math.round(rect.top * 10) / 10,
            bottom: Math.round(rect.bottom * 10) / 10,
            width: Math.round(rect.width * 10) / 10,
            height: Math.round(rect.height * 10) / 10,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
          },
        ];
      }),
    );
    return {
      viewport,
      scrollWidth: documentElement.scrollWidth,
      clientWidth: documentElement.clientWidth,
      overflowFree: documentElement.scrollWidth <= documentElement.clientWidth + 1,
      phase: document.querySelector('[data-experience]')?.dataset.phase,
      boxes,
    };
  });
  results.push({ label, ...metrics });
  if (!metrics.overflowFree) throw new Error(`${label}: detected horizontal overflow`);
  return metrics;
};

const traceReveal = async (page, useTouch = false) => {
  const canvas = page.locator('[data-reveal-canvas]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Reveal canvas has no bounding box');
  const left = box.x + 8;
  const right = box.x + box.width - 8;
  const top = box.y + 8;
  const bottom = box.y + box.height - 8;
  const rows = 16;

  if (!useTouch) {
    await page.mouse.move(left, top);
    await page.mouse.down();
    for (let row = 0; row < rows; row += 1) {
      const y = top + ((bottom - top) * row) / (rows - 1);
      const x = row % 2 === 0 ? right : left;
      await page.mouse.move(x, y, { steps: 4 });
    }
    await page.mouse.up();
    return;
  }

  const points = [];
  for (let row = 0; row < rows; row += 1) {
    points.push({
      x: row % 2 === 0 ? right : left,
      y: top + ((bottom - top) * row) / (rows - 1),
    });
  }
  await canvas.dispatchEvent('pointerdown', {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: left,
    clientY: top,
    bubbles: true,
  });
  for (const point of points) {
    await canvas.dispatchEvent('pointermove', {
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: point.x,
      clientY: point.y,
      bubbles: true,
    });
  }
  await canvas.dispatchEvent('pointerup', {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: points.at(-1).x,
    clientY: points.at(-1).y,
    bubbles: true,
  });
};

for (const testCase of [
  { name: 'mobile', viewport: { width: 390, height: 844 }, touch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, touch: false },
  { name: 'landscape', viewport: { width: 844, height: 390 }, touch: true },
]) {
  const context = await browser.newContext({ viewport: testCase.viewport, hasTouch: testCase.touch });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await measure(page, `${testCase.name}-sealed`);
  await page.screenshot({ path: `${outputDirectory}/${testCase.name}-sealed.png`, fullPage: true });

  if (testCase.name === 'desktop') {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${outputDirectory}/desktop-wax-opening.png`, fullPage: true });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outputDirectory}/desktop-pages-opening.png`, fullPage: true });
  } else {
    await page.locator('[data-wax-seal]').click({ force: true });
  }
  await waitForPhase(page, 'revealing');
  await page.waitForTimeout(650);
  await measure(page, `${testCase.name}-revealing`);
  await page.screenshot({ path: `${outputDirectory}/${testCase.name}-revealing.png`, fullPage: true });

  if (testCase.name === 'desktop') {
    const revealBox = await page.locator('[data-reveal-canvas]').boundingBox();
    if (!revealBox) throw new Error('Reveal canvas has no bounding box');
    await page.mouse.move(revealBox.x + 24, revealBox.y + revealBox.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(revealBox.x + revealBox.width - 24, revealBox.y + revealBox.height * 0.39, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${outputDirectory}/desktop-ink-awakening.png`, fullPage: true });
  }

  await traceReveal(page, testCase.touch);
  await waitForReadingHold(page, `${testCase.name}-reading`);
  await measure(page, `${testCase.name}-reading`);
  await page.screenshot({ path: `${outputDirectory}/${testCase.name}-reading.png`, fullPage: true });

  if (testCase.name === 'desktop') {
    await page.keyboard.press('Enter');
  } else {
    await page.locator('[data-continue]').click({ force: true });
  }
  await waitForFinaleReady(page, `${testCase.name}-finale`);
  await measure(page, `${testCase.name}-finale`);
  await page.screenshot({ path: `${outputDirectory}/${testCase.name}-finale.png`, fullPage: true });

  const decorationCountBeforeReset = await page.locator('.decoration').count();
  await page.locator('[data-replay]').click({ force: true });
  await waitForPhase(page, 'sealed');
  const resetState = await page.evaluate(() => ({
    canvasOpacity: getComputedStyle(document.querySelector('[data-reveal-canvas]')).opacity,
    waxOpacity: getComputedStyle(document.querySelector('[data-wax-seal]')).opacity,
    revealProgress: getComputedStyle(document.querySelector('[data-experience]')).getPropertyValue('--reveal-progress'),
    decorationCount: document.querySelectorAll('.decoration').length,
    continueDisabled: document.querySelector('[data-continue]')?.disabled,
    continueAriaHidden: document.querySelector('[data-continue]')?.getAttribute('aria-hidden'),
    continueVisibility: getComputedStyle(document.querySelector('[data-continue]')).visibility,
    continuePointerEvents: getComputedStyle(document.querySelector('[data-continue]')).pointerEvents,
  }));
  if (resetState.decorationCount !== decorationCountBeforeReset) {
    throw new Error(`${testCase.name}: decorations accumulated or disappeared after replay`);
  }
  if (resetState.revealProgress.trim() !== '0') throw new Error(`${testCase.name}: reveal progress did not reset`);
  if (
    resetState.continueDisabled !== true ||
    resetState.continueAriaHidden !== 'true' ||
    resetState.continueVisibility !== 'hidden' ||
    resetState.continuePointerEvents !== 'none'
  ) {
    throw new Error(`${testCase.name}: continue control did not reset`);
  }

  if (testCase.name === 'desktop') {
    await page.locator('[data-wax-seal]').click({ force: true });
    await waitForPhase(page, 'revealing');
    await page.locator('[data-reveal-canvas]').focus();
    await page.keyboard.press('Enter');
    await waitForReadingHold(page, `${testCase.name}-keyboard-reading`, 250);
    await page.keyboard.press('Space');
    await waitForFinaleReady(page, `${testCase.name}-keyboard-finale`);
  }

  if (runtimeErrors.length) throw new Error(`${testCase.name}: ${runtimeErrors.join(' | ')}`);
  await context.close();
}

// 同时验证 reduced-motion 与 Canvas 不可用时的淡入降级，流程不能卡住。
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const defaults = await page.evaluate(() => ({
    phase: document.querySelector('[data-experience]')?.dataset.phase,
    soundPressed: document.querySelector('[data-sound-toggle]')?.getAttribute('aria-pressed'),
    decorationDisplay: getComputedStyle(document.querySelector('.decoration')).display,
  }));
  if (defaults.phase !== 'sealed' || defaults.soundPressed !== 'false' || defaults.decorationDisplay !== 'none') {
    throw new Error(`Reduced-motion defaults invalid: ${JSON.stringify(defaults)}`);
  }
  await page.locator('[data-wax-seal]').click({ force: true });
  await waitForReadingHold(page, 'canvas-fallback-reading', 800);
  await measure(page, 'canvas-fallback-reading');
  await page.screenshot({ path: `${outputDirectory}/canvas-fallback-reading.png`, fullPage: true });
  await page.locator('[data-continue]').click({ force: true });
  await waitForFinaleReady(page, 'canvas-fallback-finale', false);
  await measure(page, 'canvas-fallback-finale');
  await page.screenshot({ path: `${outputDirectory}/canvas-fallback-finale.png`, fullPage: true });
  await context.close();
}

await browser.close();
previewServer.kill();
console.log(JSON.stringify(results, null, 2));
