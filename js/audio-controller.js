/* global AudioContext, Tone */

import { presets } from './tonejs-presets.js'
import { chords } from './chord-intervals.js'
import { noteFreqs } from './note-frequencies.js'

const CHANNEL = 1 // channels 1-16
const NOTEOFF = (0x8 << 4) + (CHANNEL - 1) // equals 128 (with channel = 1)
const NOTEON = (0x9 << 4) + (CHANNEL - 1) // equals 144 (with channel = 1)

let selectedMidiDevice = null
let midiOutputs = []

let audioCtx = null
let oscillator = null
let gainNode = null
let webAudioPlaying = false
let tonejsInstrument = null
let tonejsPlaying = false

/**
 * Get or create the Web Audio context
 */
const getAudioContext = function () {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    gainNode = audioCtx.createGain()

    oscillator = audioCtx.createOscillator()
    oscillator.connect(gainNode)

    gainNode.connect(audioCtx.destination)
  }

  return audioCtx
}

/**
 * Play a note using the MIDI device
 *
 * @param {Number} midiNote - MIDI note to play (between 0 - 127)
 * @param {Number} midiVelocity - volume to play the note at (between 0 - 127)
 * @param {Number} duration - how long (in ms) to play the note
 */
const playUsingMidiDevice = function (midiNote, midiVelocity, duration) {
  // console.log(`NOTEON('${midiNote},${midiVelocity}')`)
  selectedMidiDevice.send([NOTEON, midiNote, midiVelocity])

  setTimeout(function () {
    // console.log(`NOTEOFF('${midiNote},${midiVelocity}')`)
    selectedMidiDevice.send([NOTEOFF, midiNote, midiVelocity])
  }, duration)
}

/**
 * Play a note using the Tone.js library
 *
 * @param {Number} value - value (between 0 - 1) to use to select note from 'noteFreqs' to play
 * @param {Number} gain - volume to play the note at (between 0 - 1)
 * @param {Number} duration - how long (in ms) to play the note
 */
const playUsingTonejs = function (value, gain, duration) {
  // convert duration from ms to seconds
  const d = duration / 1000

  if (!tonejsPlaying) {
    Tone.Transport.start()
    tonejsPlaying = true
  }

  // get available notes
  const notes = Object.keys(noteFreqs)

  let note = 0
  if (notes.length) {
    // select corresponding note to play
    note = Math.round(value * (notes.length - 1))
    note = notes[note]
  } else {
    // convert to freq than to corresponding note to play
    note = (value * 2000) + 20
    note = Tone.Frequency(note, 'hz').toNote()
  }

  tonejsInstrument.volume.value = Tone.gainToDb(gain)

  Tone.Transport.scheduleOnce(function () {
    tonejsInstrument.triggerAttackRelease(note, d, Tone.now())
  })
}

/**
 * Play a note using the Web Audio API
 *
 * @param {Number} value - value (between 0 - 1) to convert to frequency (20 - 2000) to play
 * @param {Number} gain - volume to play the note at (between 0 - 1)
 * @param {Number} duration - how long (in ms) to play the note
 */
const playUsingWebAudio = function (value, gain, duration) {
  // convert value to frequency
  const f = (value * 2000) + 20

  // console.log(`f=${f}, g=${gain}`)

  getAudioContext()

  if (!webAudioPlaying) {
    oscillator = audioCtx.createOscillator()

    oscillator.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.001)
    gainNode.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.001)

    oscillator.connect(gainNode)
    oscillator.start(audioCtx.currentTime)
    webAudioPlaying = true
  } else {
    oscillator.frequency.setTargetAtTime(f, audioCtx.currentTime, 0.001)
    gainNode.gain.setTargetAtTime(gain, audioCtx.currentTime, 0.001)
  }
}

/**
 * Stop playing notes
 */
const stopWebAudio = function () {
  if (webAudioPlaying) {
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5)
    oscillator.stop(audioCtx.currentTime + 0.5)
    webAudioPlaying = false
  } else if (tonejsPlaying) {
    Tone.Transport.stop()
    tonejsPlaying = false
  }
}

/**
 * Get the list of available browser presets
 */
export function getBrowserPresets () {
  return Object.keys(presets)
}

/**
 * Set the preset Tone.js configuration when
 * playing in the browser: https://tonejs.github.io/docs/
 *
 * @param {String} name - the name of the preset to selected
 */
export function setPreferredPreset (name) {
  if (!name || name === 'default') {
    if (tonejsInstrument) {
      tonejsInstrument.dispose()
    }
    tonejsInstrument = null
  } else {
    const instrument = presets[name]
    tonejsInstrument = new Tone[instrument.instrument]().toMaster()

    try {
      // instrument['volume'] = 0
      tonejsInstrument.set(instrument.settings)
    } catch (e) {
      console.error(e)
    }
  }
}

/**
 * Set the device to send notes to
 *
 * @param {String} name - the name of the MIDI device
 */
export function setPreferredDevice (name) {
  if (!name || name === 'browser') {
    selectedMidiDevice = null
  } else {
    selectedMidiDevice = midiOutputs[name]
  }
}

/**
 * Play the given value at the given volume for the given duration using the given chords
 *
 * @param {Number} value - the MIDI note to play
 * @param {Number} volume - the volume to play the note at
 * @param {Number} duration - how long (in ms) to play the note
 */
export function playNote (value, volume, duration = 300, chordsInterval) {
  if (value && volume) {
    // keep value & volume within range (0 - 1)
    value = value < 0 ? 0 : (value > 1 ? 1 : value)
    volume = volume < 0 ? 0 : (volume > 1 ? 1 : volume)

    if (selectedMidiDevice) {
      let chordsArray = []
      if (chordsInterval && chordsInterval !== 'default' && chords.hasOwnProperty(chordsInterval)) {
        chordsArray = chords[chordsInterval]
      }

      let midiNotes = computeNote(value, 0, 1, chordsArray)
      let v = computeVelocity(volume, 0, 1, chordsArray)

      midiNotes.forEach(n => {
        // console.log(`n=${n}, v=${v}`)
        playUsingMidiDevice(n, v, duration, chordsArray)
      })
    } else if (tonejsInstrument) {
      playUsingTonejs(value, volume, duration)
    } else {
      playUsingWebAudio(value, volume, duration)
    }
  } else {
    stopWebAudio()
  }
}

/**
 * Get the list of available MIDI devices
 */
export function getMidiDevices () {
  if (navigator.requestMIDIAccess) {
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
  } else {
    return Promise.resolve(midiOutputs)
  }
}

/**
 * Compute the MIDI note based on the provided value of the given range
 *
 * @param {Number} value - a number between 'low' and 'high' to convert to MIDI note
 * @param {Number} low - corresponds to a number that should produce the lowest note
 * @param {Number} high - corresponds to a number that should produce the highest note
 * @param {Array} chords - an array of chords to choose note values from else use MIDI notes in range of 24 - 120
 */
const computeNote = function (value, low, high, chords) {
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
const computeVelocity = function (value, low, high) {
  const dist = isNaN(value) ? 0 : value
  const minDist = isNaN(low) ? 0 : low
  const maxDist = isNaN(high) ? 250 : high
  const minVelo = 0
  const maxVelo = 127

  const percent = (dist - minDist) / (maxDist - minDist)

  return Math.round(percent * (maxVelo - minVelo) + minVelo)
}
