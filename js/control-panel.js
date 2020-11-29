/* global dat, localStorage, location */

import { getMidiDevices, setPreferredDevice, getBrowserPresets, setPreferredPreset } from './audio-controller.js'
import { chords } from './chord-intervals.js'

const DEFAULTCHORDS = 'minor0'

/**
 *  Defines control panel settings and default values
 * */
export let guiState = {
  algorithm: 'multi-pose',
  outputDevice: 'browser',
  chordIntervals: 'default',
  noteDuration: 300,
  notesRangeScale: 1,
  notesRangeOffset: 0,
  browser: {
    preset: 'default'
  },
  input: {
    architecture: 'MobileNetV1',
    outputStride: 16
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5
  },
  multiPoseDetection: {
    maxPoseDetections: 1,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0
  },
  canvas: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showZones: true,
    showWaveform: true,
    showFPS: false
  },
  mqtt: {
    // Turn on publishing of user position data via MQTT
    on: false,
    secureWebsocket: true,
    brokerURL: 'test.mosquitto.org',
    brokerPort: 8081,
    eventTopic: 'veremin/{event}',
    clientId: '',
    username: '',
    password: '',
    cameraFOV: 120,
    distanceMult: 1,
    // If MQTT is enabled, subscribe to the topic and log all incoming messages
    log: false
  }
}

const storageKey = () => {
  return `[${location.href.replace(location.protocol, 'veremin:')}]`
}

const storeState = () => {
  const stateToSave = Object.assign({}, guiState)
  // do not store password
  stateToSave.mqtt.password = ''
  localStorage.setItem(storageKey(), JSON.stringify(stateToSave))
}
const loadState = () => {
  const savedStateStr = localStorage.getItem(storageKey())
  const savedStateObj = savedStateStr ? JSON.parse(savedStateStr) : {}
  guiState = merge(guiState, savedStateObj)
}
const merge = (target, source) => {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) Object.assign(source[key], merge(target[key], source[key]))
  }
  Object.assign(target || {}, source)
  return target
}

/**
 * Sets up control panel on the top-right of the window
 */
export async function setupGui (cameras, mobile, domNode = 'control-panel') {
  if (typeof (Storage) !== 'undefined') {
    window.onunload = storeState
    loadState()
  } else {
    console.log('Config state will not be stored')
  }

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId
  }
  if (mobile) {
    guiState.canvas.showWaveform = false
  }

  const gui = new dat.GUI({ width: 300, autoPlace: false })
  const controlPanel = typeof domNode === 'string' ? document.getElementById(domNode) : domNode
  controlPanel.appendChild(gui.domElement)

  // Selector for pose detection algorithm.
  // Single-pose algorithm is faster and simpler when only one person to be in the frame. Multi-pose works for more than one person in the frame.
  const algorithmController = gui.add(guiState, 'algorithm', ['multi-pose', 'single-pose'])

  // Get available MIDI output devices
  const midiDevices = await getMidiDevices()
  const mouts = Object.keys(midiDevices)
  if (mouts.length > 0) {
    guiState.outputDevice = mouts[0]
    setPreferredDevice(mouts[0])
  }

  // Selector for MIDI device (with additional option for Browser Audio API)
  const outputDeviceController = gui.add(guiState, 'outputDevice', ['browser'].concat(mouts))

  // Get available chords
  const achords = Object.keys(chords)
  if (achords.length > 0) {
    const defaultIndex = achords.indexOf(DEFAULTCHORDS)
    guiState.chordIntervals = defaultIndex >= 0 ? achords[defaultIndex] : achords[0]
  }

  // Selector for values to use for the MIDI notes
  gui.add(guiState, 'chordIntervals', ['default'].concat(achords))

  // Selector for the duration (in milliseconds) for how long a note is ON
  gui.add(guiState, 'noteDuration', 100, 2000, 50)

  // Selector for the vertical scale of the range
  gui.add(guiState, 'notesRangeScale', 0.6, 8, 0.05)

  gui.add(guiState, 'notesRangeOffset', 0, 1, 0.01)

  const browserPreset = gui.addFolder('Browser')

  // Get available browser presets
  const binst = getBrowserPresets()
  if (binst.length > 0) {
    guiState.browser.preset = binst[0]
    setPreferredPreset(binst[0])
  }

  // Selector for Tone.js presets to use in the browser
  const browserPresetController = browserPreset.add(guiState.browser, 'preset', ['default'].concat(binst))

  // The input parameters have the most effect on accuracy and speed of the network
  const input = gui.addFolder('Input')

  // Architecture
  const architectureController = input.add(
    guiState.input,
    'architecture',
    ['MobileNetV1', 'ResNet50']
  )

  // Output stride: affects the height and width of the layers in the neural network.
  // The lower the value of the output stride the higher the accuracy but slower the speed,
  // the higher the value the faster the speed but lower the accuracy.
  input.add(guiState.input, 'outputStride', [8, 16, 32])

  const single = gui.addFolder('Single Pose Detection')

  // Pose confidence: the overall confidence in the estimation of a person's pose
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0)

  // Min part confidence: the confidence a particular estimated keypoint position is accurate
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0)

  const multi = gui.addFolder('Multi Pose Detection')
  multi.add(guiState.multiPoseDetection, 'maxPoseDetections')
    .min(1)
    .max(10)
    .step(1)

  multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0)
  multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0)

  // nms Radius: controls the minimum distance between poses that are returned
  // defaults to 20, which is probably fine for most use cases
  multi.add(guiState.multiPoseDetection, 'nmsRadius')
    .min(0.0)
    .max(40.0)

  multi.open()

  const canvas = gui.addFolder('Canvas')
  canvas.add(guiState.canvas, 'showVideo')
  canvas.add(guiState.canvas, 'showSkeleton')
  canvas.add(guiState.canvas, 'showPoints')
  canvas.add(guiState.canvas, 'showZones')
  canvas.add(guiState.canvas, 'showWaveform')
  canvas.add(guiState.canvas, 'showFPS')

  const mqtt = gui.addFolder('MQTT')
  mqtt.add(guiState.mqtt, 'on')
  mqtt.add(guiState.mqtt, 'secureWebsocket')
  mqtt.add(guiState.mqtt, 'brokerURL')
  mqtt.add(guiState.mqtt, 'brokerPort')
  mqtt.add(guiState.mqtt, 'eventTopic')
  mqtt.add(guiState.mqtt, 'clientId')
  const un = mqtt.add(guiState.mqtt, 'username')
  const pwd = mqtt.add(guiState.mqtt, 'password')
  mqtt.add(guiState.mqtt, 'cameraFOV')
  mqtt.add(guiState.mqtt, 'distanceMult', 0.25, 4.0)
  mqtt.add(guiState.mqtt, 'log')

  const unElt = un.domElement.firstChild
  unElt.name = 'username'
  const pwdElt = pwd.domElement.firstChild
  pwdElt.name = 'password'
  pwdElt.type = 'password'

  mqtt.open()

  architectureController.onChange(function (architecture) {
    guiState.changeToArchitecture = architecture
  })

  algorithmController.onChange(function (value) {
    if (guiState.algorithm === 'multi-pose') {
      single.close()
      multi.open()
    } else {
      multi.close()
      single.open()
    }
  })

  outputDeviceController.onChange(function (value) {
    if (!guiState.outputDevice || guiState.outputDevice === 'browser') {
      browserPreset.open()
    } else {
      browserPreset.close()
    }

    setPreferredDevice(guiState.outputDevice)
  })

  browserPresetController.onChange(function (value) {
    setPreferredPreset(guiState.browser.preset)
  })
}
