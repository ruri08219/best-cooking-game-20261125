// Tiny synthesised sound effects (WebAudio only, no audio files): a chop thock,
// a grill sizzle, a serve ding and a miss buzz. The context is created on the
// first user gesture, so the page never tries to play before it is allowed to.

export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = false;
      }
    }
    if (context && context.state === 'suspended') void context.resume();
    return context || null;
  }

  function tone(frequency, duration, type, gainValue, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    const start = audio.currentTime + when;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  function noise(duration, gainValue, filterFrequency) {
    const audio = ensure();
    if (!audio || muted) return;
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = audio.createGain();
    gain.gain.value = gainValue;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    pickup() {
      tone(520, 0.07, 'triangle', 0.12);
    },
    chop() {
      noise(0.09, 0.25, 900);
      tone(180, 0.08, 'square', 0.06);
    },
    chopDone() {
      tone(660, 0.09, 'triangle', 0.14);
      tone(880, 0.12, 'triangle', 0.12, 0.07);
    },
    grillStart() {
      noise(0.35, 0.12, 3200);
    },
    grillDone() {
      tone(740, 0.1, 'sine', 0.14);
      tone(988, 0.14, 'sine', 0.12, 0.08);
    },
    burn() {
      tone(220, 0.25, 'sawtooth', 0.1);
      tone(160, 0.3, 'sawtooth', 0.08, 0.1);
    },
    serve() {
      tone(784, 0.12, 'triangle', 0.16);
      tone(1047, 0.2, 'triangle', 0.16, 0.09);
      tone(1319, 0.24, 'triangle', 0.12, 0.18);
    },
    error() {
      tone(140, 0.16, 'square', 0.08);
    },
    miss() {
      tone(330, 0.2, 'sawtooth', 0.1);
      tone(247, 0.3, 'sawtooth', 0.1, 0.14);
    },
    tick() {
      tone(980, 0.05, 'square', 0.05);
    },
    start() {
      tone(523, 0.1, 'triangle', 0.14);
      tone(659, 0.1, 'triangle', 0.14, 0.09);
      tone(784, 0.18, 'triangle', 0.14, 0.18);
    },
  };
}
