type SoundName = 'wax';

const backgroundMusicUrl = new URL('../assets/audio/happybirthday.mp3', import.meta.url).href;
const backgroundMusicVolume = 0.42;

/**
 * 背景音乐使用本地 MP3 循环播放，火漆音继续由 Web Audio 现场合成。
 * 所有音频只会在用户主动交互后启动；播放失败时静音降级，不影响视觉流程。
 */
export class SoundController {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private music: HTMLAudioElement | null = null;
  private muted = true;
  private unlocked = false;
  private resumeMusicAfterVisibility = false;
  private readonly activeSources = new Set<AudioScheduledSourceNode>();

  get isMuted(): boolean {
    return this.muted;
  }

  async unlockFromGesture(): Promise<void> {
    this.unlocked = true;
    try {
      this.ensureContext();
      if (this.context?.state === 'suspended') await this.context.resume();
    } catch {
      // 浏览器拒绝音频时保持静音，视觉流程不受影响。
    }
  }

  async toggleFromGesture(): Promise<boolean> {
    // 在点击处理链首次 await 之前创建并播放，兼容更严格的移动端自动播放策略。
    this.unlocked = true;
    try {
      this.ensureContext();
    } catch {
      // Web Audio 不可用时，背景音乐仍可独立尝试播放。
    }
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.72, this.context?.currentTime ?? 0, 0.025);
    }
    if (this.muted) {
      this.stopAll();
      this.stopBackgroundMusic();
    } else {
      void this.playBackgroundMusic();
    }
    try {
      if (this.context?.state === 'suspended') await this.context.resume();
    } catch {
      // 音频上下文恢复失败时安静降级。
    }
    return this.muted;
  }

  play(name: SoundName): void {
    if (this.muted || !this.unlocked) return;
    void this.playSafely(name);
  }

  async pauseForVisibility(): Promise<void> {
    this.stopAll();
    this.resumeMusicAfterVisibility = !this.muted && Boolean(this.music);
    this.music?.pause();
    try {
      if (this.context?.state === 'running') await this.context.suspend();
    } catch {
      // 页面切后台时，暂停失败也不应产生未处理异常。
    }
  }

  async resumeForVisibility(): Promise<void> {
    const shouldResumeMusic = this.resumeMusicAfterVisibility;
    this.resumeMusicAfterVisibility = false;
    if (shouldResumeMusic && !this.muted) await this.playBackgroundMusic();
  }

  stopAll(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // 已结束的节点再次 stop 会抛错，忽略即可。
      }
    });
    this.activeSources.clear();
  }

  destroy(): void {
    this.stopAll();
    this.stopBackgroundMusic();
    if (this.music) {
      this.music.removeAttribute('src');
      this.music.load();
      this.music = null;
    }
    void this.context?.close().catch(() => undefined);
    this.context = null;
    this.masterGain = null;
  }

  private ensureContext(): void {
    if (this.context) return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.72;
    this.masterGain.connect(this.context.destination);
  }

  private async playSafely(name: SoundName): Promise<void> {
    try {
      this.ensureContext();
      if (!this.context || !this.masterGain) return;
      if (this.context.state === 'suspended') await this.context.resume();

      if (name === 'wax') this.playWax(this.context, this.masterGain);
    } catch {
      // 缺少 Web Audio 或播放策略限制时安静降级。
    }
  }

  private ensureMusic(): HTMLAudioElement {
    if (this.music) return this.music;
    const music = new Audio(backgroundMusicUrl);
    music.loop = true;
    music.preload = 'auto';
    music.volume = backgroundMusicVolume;
    this.music = music;
    return music;
  }

  private async playBackgroundMusic(): Promise<void> {
    if (this.muted || !this.unlocked || document.hidden) return;
    try {
      await this.ensureMusic().play();
    } catch {
      // 浏览器拒绝媒体播放或素材不可用时，保持静音降级。
    }
  }

  private stopBackgroundMusic(): void {
    this.resumeMusicAfterVisibility = false;
    if (!this.music) return;
    this.music.pause();
    try {
      this.music.currentTime = 0;
    } catch {
      // 尚未载入元数据时可能无法重置进度，忽略即可。
    }
  }

  private track<T extends AudioScheduledSourceNode>(source: T): T {
    this.activeSources.add(source);
    source.addEventListener('ended', () => this.activeSources.delete(source), { once: true });
    return source;
  }

  private createNoise(context: AudioContext, duration: number): AudioBufferSourceNode {
    const length = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 2187;
    for (let index = 0; index < length; index += 1) {
      seed = (seed * 16807) % 2147483647;
      data[index] = ((seed / 2147483647) * 2 - 1) * (1 - index / length);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    return this.track(source);
  }

  private playWax(context: AudioContext, destination: AudioNode): void {
    const now = context.currentTime;
    const source = this.createNoise(context, 0.24);
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(980, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.22);
    filter.Q.value = 1.1;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    source.connect(filter).connect(gain).connect(destination);
    source.start(now);
    source.stop(now + 0.25);
  }
}
