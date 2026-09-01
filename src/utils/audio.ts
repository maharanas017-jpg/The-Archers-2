// Procedural sound generator using Web Audio API

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuteStatus(): boolean {
    return this.isMuted;
  }

  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  public playStretch() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.1);

      // Low pass filter to make it sound creaky
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);

      osc.disconnect(gain);
      osc.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn(e);
    }
  }

  public playShoot(weaponType: 'BOW' | 'SPEAR' | 'SHURIKEN') {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (weaponType === 'BOW') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      } else if (weaponType === 'SPEAR') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      } else {
        // Shuriken - quick metallic swish
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn(e);
    }
  }

  public playHit() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      
      // Make a buffer with noise for a meaty impact sound
      const bufferSize = ctx.sampleRate * 0.15; // 150ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start();
      noiseNode.stop(ctx.currentTime + 0.15);

      // Play an additional low thud
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
      oscGain.gain.setValueAtTime(0.15, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      console.warn(e);
    }
  }

  public playHeadshot(hasHelmet: boolean) {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();

      if (hasHelmet) {
        // Metallic clink
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1800, ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(1500, ctx.currentTime + 0.2);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2400, ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(2100, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        osc1.start();
        osc2.start();
        osc1.stop(ctx.currentTime + 0.2);
        osc2.stop(ctx.currentTime + 0.2);
      } else {
        // High splat + ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  public playShieldDeflect() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Wooden block knock
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn(e);
    }
  }

  public playCoin() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08); // E6

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn(e);
    }
  }

  public playSpell() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.4);

      filter.type = 'peaking';
      filter.frequency.setValueAtTime(400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn(e);
    }
  }

  public playLevelUp() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.3);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.3);
      });
    } catch (e) {
      console.warn(e);
    }
  }

  public playGameOver() {
    if (this.isMuted) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;

      const notes = [392.00, 349.23, 311.13, 261.63, 220.00, 196.00]; // descending minor/sad melody
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.15);

        gain.gain.setValueAtTime(0, now + index * 0.15);
        gain.gain.linearRampToValueAtTime(0.15, now + index * 0.15 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.15 + 0.4);

        osc.start(now + index * 0.15);
        osc.stop(now + index * 0.15 + 0.4);
      });
    } catch (e) {
      console.warn(e);
    }
  }
}

export const audio = new SoundEngine();
export default audio;
