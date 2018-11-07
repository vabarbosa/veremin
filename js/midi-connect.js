
const CHANNEL = 1 // channels 1-16
const NOTEOFF = (0x8 << 4) + (CHANNEL - 1) // equals 128 (with channel = 1)
const NOTEON =  (0x9 << 4) + (CHANNEL - 1) // equals 144 (with channel = 1)
const NOTEDURATION = 300 // in ms

let selectedMidiDevice = null
let audioCtx = null
let oscillator = null
let gainNode = null
let isStarted = false
let midiOutputs = []

const getOrCreateContext = function () {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    oscillator.connect(audioCtx.destination)
    gainNode.connect(audioCtx.destination)
  }
  return audioCtx;
}

const noteOn = function (midiNote, midiVelocity) {
  getOrCreateContext()
  const freq = Math.pow(2, (midiNote - 69) / 12) * 440
  oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0)
  if (midiVelocity) {
    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, midiVelocity / 127)
    // gainNode.gain.value = midiVelocity / 127
  }
  if (!isStarted) {
    oscillator.start(0);
    isStarted = true;
  } else {
    audioCtx.resume();
  }
}

const noteOff = function () {
  gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.005)
  setTimeout(() => {
    audioCtx.suspend()
  }, 50)
  // audioCtx.suspend();
}

export function setPreferredDevice (name) {
  selectedMidiDevice = (name === 'browser') ? null : midiOutputs[name]
}

export function sendMidiNote (note, velocity) {
  if (note && velocity) {
    console.log(`NOTEON('${note},${velocity}')`)

    if (selectedMidiDevice) {
      selectedMidiDevice.send([NOTEON, note, velocity])
    } else {
      noteOn(note, velocity)
    }

    setTimeout(
      function() {
        console.log(`NOTEOFF('${note},${velocity}')`)
        if (selectedMidiDevice) {
          selectedMidiDevice.send([NOTEOFF, note, velocity])
        } else {
          noteOff()
        }
      },
      NOTEDURATION
    )
  }
}

export function getMidiDevices () {
  return navigator
    .requestMIDIAccess()
    .then(function(access) {
      console.log('access', access)
      
      let midilist = Array.from(access.outputs.values())
      midilist.forEach(e => {
        midiOutputs[`${e.name} (${e.manufacturer})`] = e
      })

      return midiOutputs
    })
}

// http://www.derickdeleon.com/2014/07/midi-based-theremin-using-raspberry-pi.html
export function computeNote (dist, min, max) {
  dist = dist || 0
  
  const minDist = min || 0
  const maxDist = max || 250
  const octaves = 8
  const minNote = 24 // c4 = middle c = 48
  const maxNote = minNote + (12 * octaves)

  const fup = (dist - minDist) * (maxNote - minNote)
  const fdown = (maxDist - minDist)
  const note = minNote + fup/fdown

  return Math.round(note)
}
