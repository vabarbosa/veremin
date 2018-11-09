/* global AudioContext */

const CHANNEL = 1 // channels 1-16
const NOTEOFF = (0x8 << 4) + (CHANNEL - 1) // equals 128 (with channel = 1)
const NOTEON = (0x9 << 4) + (CHANNEL - 1) // equals 144 (with channel = 1)

let selectedMidiDevice = null
let audioCtx = null
let oscillator = null
let gainNode = null
let isStarted = false
let midiOutputs = []

/**
 * Set up the Web Audio context
 */
const getOrCreateContext = function () {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    oscillator = audioCtx.createOscillator()
    gainNode = audioCtx.createGain()

    oscillator.connect(gainNode)
    oscillator.connect(audioCtx.destination)
    gainNode.connect(audioCtx.destination)
  }

  return audioCtx
}

/**
 * Play a note using the Web Audio
 *
 * @param {Number} midiNote - MIDI note to play (between 0 - 127)
 * @param {Number} midiVelocity - volume to play the note at (between 0 - 127)
 */
const playNote = function (midiNote, midiVelocity) {
  getOrCreateContext()
  const freq = Math.pow(2, (midiNote - 69) / 12) * 440
  oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0)
  if (midiVelocity) {
    gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, midiVelocity / 127)
  }
  if (!isStarted) {
    oscillator.start(0)
    isStarted = true
  } else {
    audioCtx.resume()
  }
}

/**
 * Stop playing notes
 */
const stopNote = function () {
  audioCtx.suspend()

  // TODO: resolve clicking when playing is stopped
  // gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.005)
  // setTimeout(() => {
  //   audioCtx.suspend()
  // }, 50)
}

/**
 * Set the device to send notes to
 *
 * @param {String} name - the name of the MIDI device
 */
export function setPreferredDevice (name) {
  selectedMidiDevice = (name === 'browser') ? null : midiOutputs[name]
}

/**
 * Send the given note to the MIDI device
 *
 * @param {Number} note - the MIDI note to play
 * @param {Number} velocity - the volume to play the note at
 * @param {Number} duration - how long (in ms) to play the note for (default: 300 ms)
 */
export function sendMidiNote (note, velocity, duration = 300) {
  if (note && velocity) {
    // console.log(`NOTEON('${note}, ${velocity}')`)

    if (selectedMidiDevice) {
      selectedMidiDevice.send([NOTEON, note, velocity])
    } else {
      playNote(note, velocity)
    }

    setTimeout(
      function () {
        // console.log(`NOTEOFF('${note},${velocity}')`)
        if (selectedMidiDevice) {
          selectedMidiDevice.send([NOTEOFF, note, velocity])
        } else {
          stopNote()
        }
      },
      duration
    )
  }
}

/**
 * Get the list of available MIDI devices
 */
export function getMidiDevices () {
  return navigator
    .requestMIDIAccess()
    .then(function (access) {
      console.log('MIDIAccess', access)

      let midilist = Array.from(access.outputs.values())
      midilist.forEach(e => {
        midiOutputs[`${e.name} (${e.manufacturer})`] = e
      })

      return midiOutputs
    })
}

/**
 * Compute the MIDI note based on the provided value of the given range
 *
 * @param {Number} value - a number between 'low' and 'high' to convert to MIDI note
 * @param {Number} low - corresponds to a number that should produce the lowest note
 * @param {Number} high - corresponds to a number that should produce the highest note
 * @param {Array} chords - an array of chords to choose note values from else use MIDI notes in range of 24 - 120
 */
export function computeNote (value, low, high, chords) {
  const dist = isNaN(value) ? 0 : value
  const minDist = isNaN(low) ? 0 : low
  const maxDist = isNaN(high) ? 250 : high
  const octaves = 8

  const hasChords = Array.isArray(chords) && chords.length > 0
  const minNote = hasChords ? 0 : 24
  const maxNote = hasChords ? chords.length - 1 : minNote + (12 * octaves)
  const percent = (dist - minDist) / (maxDist - minDist)

  let note = Math.round(percent * (maxNote - minNote) + minNote)
  note = hasChords ? chords[note] : note

  return Array.isArray(note) ? note : [note]
}

/**
 * Compute the MIDI velocity based on the provided value of the given range
 *
 * @param {Number} value - a number between 'low' and 'high' to convert to MIDI velocity
 * @param {Number} low - corresponds to a number that should produce the lowest velocity
 * @param {Number} high - corresponds to a number that should produce the highest velocity
 */
export function computeVelocity (value, low, high) {
  const dist = isNaN(value) ? 0 : value
  const minDist = isNaN(low) ? 0 : low
  const maxDist = isNaN(high) ? 250 : high
  const minVelo = 0
  const maxVelo = 127

  const percent = (dist - minDist) / (maxDist - minDist)

  return Math.round(percent * (maxVelo - minVelo) + minVelo)
}
