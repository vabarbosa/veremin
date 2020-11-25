/**
 * Tone.js Presets - these are instrument presets for Tone.js
 * New Presets can be added and they should show up in the control panel (after
 * redeployment).
 *
 * https://tonejs.github.io
 * https://tonejs.github.io/Presets
 */
export const presets = {
  Synth1: {
    instrument: 'Synth',
    settings: {
      oscillator: {
        type: 'fatsine4',
        spread: 60,
        count: 10
      },
      envelope: {
        attack: 0.4,
        decay: 0.01,
        sustain: 1,
        attackCurve: 'sine',
        releaseCurve: 'sine',
        release: 0.4
      }
    }
  },
  Synth2: {
    instrument: 'Synth',
    settings: {
      oscillator: {
        type: 'fatsawtooth',
        count: 3,
        spread: 30
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.4,
        attackCurve: 'exponential'
      }
    }
  },
  AMSynth1: {
    instrument: 'AMSynth',
    settings: {
      harmonicity: 3.999,
      oscillator: {
        type: 'square'
      },
      envelope: {
        attack: 0.03,
        decay: 0.3,
        sustain: 0.7,
        release: 0.8
      },
      modulation: {
        volume: 12,
        type: 'square6'
      },
      modulationEnvelope: {
        attack: 2,
        decay: 3,
        sustain: 0.8,
        release: 0.1
      }
    }
  },
  FMSynth1: {
    instrument: 'FMSynth',
    settings: {
      harmonicity: 3.01,
      modulationIndex: 14,
      oscillator: {
        type: 'triangle'
      },
      envelope: {
        attack: 0.2,
        decay: 0.3,
        sustain: 0.1,
        release: 1.2
      },
      modulation: {
        type: 'square'
      },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.5,
        sustain: 0.2,
        release: 0.1
      }
    }
  }
}
