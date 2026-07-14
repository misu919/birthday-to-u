export const cardContent = {
  documentTitle: '给 xxx 的生日花信',
  documentDescription: '一封为你封存的生日花信',
  cover: 'xxx 亲启',
  decorative: {
    innerMark: 'A LETTER FOR YOU',
    waxMonogram: '花',
  },
  hints: {
    sealed: '轻触封印，开启这封花信',
    revealing: '移动光芒，读完这封信',
    keyboard: '按 Enter 或空格键也可以开启',
  },
  letter: {
    salutation: 'xxx：',
    birthday: '生日快乐。',
    wishes: [
      '愿你在新的一岁里，',
      '仍然拥有认真感受生活的勇气，',
      '遇见值得期待的人和事，',
      '也一直保留属于自己的自由与快乐。',
    ],
    signature: '—— xxxxx',
    date: 'xxxx.xx.xx',
  },
  finale: {
    title: '生日快乐',
    wishes: ['愿你岁岁平安，', '天天开心。'],
    footer: 'xxx · xxxx.xx.xx',
  },
  controls: {
    continue: '翻至下一页',
    continueAria: '读完这封信，翻至下一页',
    replay: '再次阅读',
    soundOn: '声音：开',
    soundOff: '声音：关',
    soundOnAria: '关闭贺卡声音',
    soundOffAria: '开启贺卡声音',
    sealAria: '触摸火漆印，开启生日花信',
    revealAria: '在信纸上移动指针显影祝福；也可按回车键直接读完',
  },
  accessibility: {
    sceneLabel: '封存的花信生日贺卡',
    letterLabel: '生日祝福信',
    controlsLabel: '贺卡控制',
    openedStatus: '花信已经打开，可以移动光芒显影祝福。',
    completingStatus: '光芒已经唤醒祝福，文字正在完整显现。',
    readingReadyStatus: '祝福已经完整显现。请慢慢读完，准备好后翻至下一页。',
  },
} as const;

export const theme = {
  background: '#F3EEE6',
  cover: '#684B53',
  rose: '#CDAEAA',
  gold: '#C3A15D',
  paper: '#F7F1E7',
  ink: '#343D38',
} as const;

export const experience = {
  revealThreshold: 0.65,
  idleHintDelayMs: 3000,
  maxTiltDegrees: 4,
} as const;
