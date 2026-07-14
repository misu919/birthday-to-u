import { cardContent } from '../config/content';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });

const coverBotanical = `
  <svg class="cover-botanical" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M34 186C55 169 67 146 69 115C71 84 83 59 108 42" />
      <path d="M69 120C52 113 43 101 41 85C57 87 69 98 72 113" />
      <path d="M72 101C87 95 98 83 102 66C87 69 75 79 70 93" />
      <path d="M58 151C43 148 33 140 27 126C43 125 56 134 63 145" />
      <path d="M286 34C266 50 253 73 249 103C246 134 232 158 207 175" />
      <path d="M249 99C266 106 276 117 279 133C263 132 251 122 247 107" />
      <path d="M246 118C231 123 219 135 215 152C231 149 243 139 248 126" />
      <path d="M260 68C276 71 287 79 293 93C276 94 264 85 257 74" />
      <path d="M108 42c8-8 17-10 26-6c-3 11-12 17-26 18c-6-4-6-8 0-12Z" />
      <path d="M207 175c-8 8-17 10-26 6c3-11 12-17 26-18c6 4 6 8 0 12Z" />
      <circle cx="118" cy="37" r="2.3" />
      <circle cx="198" cy="181" r="2.3" />
    </g>
  </svg>`;

const paperBotanical = `
  <svg class="paper-botanical paper-botanical--top" viewBox="0 0 150 120" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
      <path d="M137 9C107 17 87 35 77 61C67 88 47 103 12 111" />
      <path d="M91 40C94 25 103 16 118 13C116 27 108 37 94 44" />
      <path d="M76 63C93 61 105 67 113 80C98 84 86 78 78 68" />
      <path d="M57 87C49 73 37 68 22 71C28 85 39 92 54 92" />
    </g>
  </svg>
  <svg class="paper-botanical paper-botanical--bottom" viewBox="0 0 150 120" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
      <path d="M137 9C107 17 87 35 77 61C67 88 47 103 12 111" />
      <path d="M91 40C94 25 103 16 118 13C116 27 108 37 94 44" />
      <path d="M76 63C93 61 105 67 113 80C98 84 86 78 78 68" />
      <path d="M57 87C49 73 37 68 22 71C28 85 39 92 54 92" />
    </g>
  </svg>`;

export const createTemplate = (): string => {
  const copy = cardContent;
  const wishLines = copy.letter.wishes
    .map((line) => `<span class="reveal-line reveal-target">${escapeHtml(line)}</span>`)
    .join('');
  const finaleLines = copy.finale.wishes
    .map((line) => `<p class="finale-line">${escapeHtml(line)}</p>`)
    .join('');

  return `
    <main class="experience phase-sealed" data-experience>
      <div class="ambient ambient--one" aria-hidden="true"></div>
      <div class="ambient ambient--two" aria-hidden="true"></div>
      <div class="botanical-shadow botanical-shadow--left" aria-hidden="true"></div>
      <div class="botanical-shadow botanical-shadow--right" aria-hidden="true"></div>

      <section class="scene" aria-label="${escapeHtml(copy.accessibility.sceneLabel)}">
        <div class="card-stage" data-card-stage>
          <div class="card-float" data-card-float>
            <div class="card-book" data-card-book>
              <div class="card-depth" aria-hidden="true"></div>
              <div class="card-inner" aria-hidden="true">
                <span class="card-inner-mark">${escapeHtml(copy.decorative.innerMark)}</span>
              </div>

              <article class="letter-sheet" data-letter-sheet aria-label="${escapeHtml(copy.accessibility.letterLabel)}">
                <div class="letter-paper" data-letter-paper aria-hidden="true"></div>
                <div class="paper-ornaments" data-paper-ornaments aria-hidden="true">
                  ${paperBotanical}
                  <span class="paper-rule paper-rule--top"></span>
                  <span class="paper-rule paper-rule--bottom"></span>
                </div>

                <div class="letter-copy-wrap" data-letter-copy-wrap>
                  <div class="letter-copy" data-letter-copy>
                    <p class="letter-salutation reveal-target">${escapeHtml(copy.letter.salutation)}</p>
                    <p class="letter-birthday reveal-target" data-birthday-line>${escapeHtml(copy.letter.birthday)}</p>
                    <p class="letter-wishes">${wishLines}</p>
                    <div class="letter-signoff">
                      <p class="reveal-target">${escapeHtml(copy.letter.signature)}</p>
                      <p class="reveal-target">${escapeHtml(copy.letter.date)}</p>
                    </div>
                  </div>
                  <canvas
                    class="reveal-canvas"
                    data-reveal-canvas
                    tabindex="-1"
                    role="application"
                    aria-label="${escapeHtml(copy.controls.revealAria)}"
                  ></canvas>
                  <div class="reveal-glow" data-reveal-glow aria-hidden="true"></div>
                </div>

                <div class="finale-content" data-finale-content aria-live="polite" aria-hidden="true">
                  <h1 class="finale-title" data-finale-title>${escapeHtml(copy.finale.title)}</h1>
                  <div class="finale-wishes">${finaleLines}</div>
                  <p class="finale-footer">${escapeHtml(copy.finale.footer)}</p>
                </div>
              </article>

              <div class="card-page card-page--left" data-page-left aria-hidden="true">
                <div class="page-face page-face--front">
                  ${coverBotanical}
                  <span class="cover-copy cover-copy--left">${escapeHtml(copy.cover)}</span>
                </div>
                <div class="page-face page-face--back"><span class="inside-sprig"></span></div>
              </div>

              <div class="card-page card-page--right" data-page-right aria-hidden="true">
                <div class="page-face page-face--front">
                  ${coverBotanical}
                  <span class="cover-copy cover-copy--right">${escapeHtml(copy.cover)}</span>
                </div>
                <div class="page-face page-face--back"><span class="inside-sprig inside-sprig--right"></span></div>
              </div>

              <button class="wax-seal" data-wax-seal type="button" aria-label="${escapeHtml(copy.controls.sealAria)}">
                <span class="wax-base" aria-hidden="true"></span>
                <span class="wax-fragment wax-fragment--one" aria-hidden="true"></span>
                <span class="wax-fragment wax-fragment--two" aria-hidden="true"></span>
                <span class="wax-fragment wax-fragment--three" aria-hidden="true"></span>
                <svg class="wax-cracks" viewBox="0 0 84 84" aria-hidden="true" focusable="false">
                  <path pathLength="1" d="M42 18 38 34 45 43 37 52 40 68" />
                  <path pathLength="1" d="M44 42 58 35 66 39" />
                  <path pathLength="1" d="M38 34 25 29 18 34" />
                  <path pathLength="1" d="M37 52 26 58 22 66" />
                </svg>
                <span class="wax-monogram" aria-hidden="true">${escapeHtml(copy.decorative.waxMonogram)}</span>
              </button>
            </div>
          </div>
        </div>

        <p class="stage-hint" data-stage-hint aria-live="polite">${escapeHtml(copy.hints.sealed)}</p>
        <button
          class="letter-turn-button"
          data-continue
          type="button"
          aria-label="${escapeHtml(copy.controls.continueAria)}"
          aria-hidden="true"
          disabled
        >
          <span class="letter-turn-line" aria-hidden="true"></span>
          <span>${escapeHtml(copy.controls.continue)}</span>
          <svg viewBox="0 0 24 12" aria-hidden="true" focusable="false">
            <path d="M1 6h20M16.5 1.8 21 6l-4.5 4.2" />
          </svg>
        </button>
        <p class="keyboard-note">${escapeHtml(copy.hints.keyboard)}</p>
      </section>

      <nav class="utility-controls" aria-label="${escapeHtml(copy.accessibility.controlsLabel)}">
        <button class="quiet-button replay-button" data-replay type="button" aria-label="${escapeHtml(copy.controls.replay)}" aria-hidden="true" disabled>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.8 7.2A7 7 0 1 1 5 12M6.8 7.2V3.8M6.8 7.2h3.4" /></svg>
          <span>${escapeHtml(copy.controls.replay)}</span>
        </button>
        <button class="quiet-button sound-button" data-sound-toggle type="button" aria-label="${escapeHtml(copy.controls.soundOffAria)}" aria-pressed="false">
          <svg class="sound-icon sound-icon--off" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 10v4h3l4 3V7L8 10H5Z" />
            <path class="sound-cross" d="m17 10 4 4m0-4-4 4" />
            <path class="sound-waves" d="M16 9.2c1.4 1.6 1.4 4 0 5.6m2.6-8.2c2.8 3 2.8 7.8 0 10.8" />
          </svg>
          <span data-sound-label>${escapeHtml(copy.controls.soundOff)}</span>
        </button>
      </nav>

      <div class="sr-status" data-sr-status aria-live="polite"></div>
    </main>`;
};
