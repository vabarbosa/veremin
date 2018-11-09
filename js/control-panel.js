/* global dat */

import { getMidiDevices, setPreferredDevice } from './midi-connect.js'
import { chords } from './chord-intervals.js'

/**
 *  Defines control panel settings and default values
 * */
export let guiState = {
  algorithm: 'multi-pose',
  midiDevice: 'browser',
  chordIntervals: 'default',
  noteDuration: 300,
  midiData: {
    Note: 70,
    Velocity: 75
  },
  input: {
    mobileNetArchitecture: '0.75',
    outputStride: 16,
    imageScaleFactor: 0.5
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5
  },
  multiPoseDetection: {
    maxPoseDetections: 5,
    minPoseConfidence: 0.15,
    minPartConfidence: 0.1,
    nmsRadius: 30.0
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
    showZones: true
  }
}

/**
 * Sets up control panel on the top-right of the window
 */
export async function setupGui (cameras, mobile) {
  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId
  }

  const gui = new dat.GUI({ width: 300 })

  // Selector for pose detection algorithm.
  // Single-pose algorithm is faster and simpler when only one person to be in the frame. Multi-pose works for more than one person in the frame.
  const algorithmController = gui.add(guiState, 'algorithm', [ 'multi-pose', 'single-pose' ])

  // Get available MIDI output devices
  const midiDevices = await getMidiDevices()
  const mouts = Object.keys(midiDevices)
  if (mouts.length > 0) {
    guiState.midiDevice = mouts[0]
    setPreferredDevice(mouts[0])
  }

  // Selector for MIDI device (with additional option for Browser Audio API)
  const midiDeviceController = gui.add(guiState, 'midiDevice', ['browser'].concat(mouts))

  // Get available chords
  const achords = Object.keys(chords)
  if (achords.length > 0) {
    guiState.chordIntervals = achords[0]
  }

  // Selector for values to use for the MIDI notes
  gui.add(guiState, 'chordIntervals', ['default'].concat(achords))

  // Selector for the duration (in milliseconds) for how long a note is ON
  gui.add(guiState, 'noteDuration', 100, 2000, 50)

  // Show the computed note and velocity values
  let msgMidi = gui.addFolder('MIDI Data')
  msgMidi.add(guiState.midiData, 'Note', 0, 127).listen()
  msgMidi.add(guiState.midiData, 'Velocity', 0, 127).listen()
  msgMidi.open()

  // The input parameters have the most effect on accuracy and speed of the network
  let input = gui.addFolder('Input')

  // Architecture: there are a few PoseNet models varying in size and accuracy.
  // 1.01 is the largest, but will be the slowest. 0.50 is the fastest, but least accurate.
  guiState.mobileNetArchitecture = mobile ? '0.50' : '0.75'
  const architectureController = input.add(
    guiState.input,
    'mobileNetArchitecture',
    ['1.01', '1.00', '0.75', '0.50']
  )

  // Output stride: affects the height and width of the layers in the neural network.
  // The lower the value of the output stride the higher the accuracy but slower the speed,
  // the higher the value the faster the speed but lower the accuracy.
  input.add(guiState.input, 'outputStride', [8, 16, 32])

  // Image scale factor: What to scale the image by before feeding it through the network.
  input.add(guiState.input, 'imageScaleFactor')
    .min(0.2)
    .max(1.0)

  let single = gui.addFolder('Single Pose Detection')

  // Pose confidence: the overall confidence in the estimation of a person's pose
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0)

  // Min part confidence: the confidence a particular estimated keypoint position is accurate
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0)

  let multi = gui.addFolder('Multi Pose Detection')
  multi.add(guiState.multiPoseDetection, 'maxPoseDetections')
    .min(1)
    .max(20)
    .step(1)

  multi.add(guiState.multiPoseDetection, 'minPoseConfidence', 0.0, 1.0)
  multi.add(guiState.multiPoseDetection, 'minPartConfidence', 0.0, 1.0)

  // nms Radius: controls the minimum distance between poses that are returned
  // defaults to 20, which is probably fine for most use cases
  multi.add(guiState.multiPoseDetection, 'nmsRadius')
    .min(0.0)
    .max(40.0)

  multi.open()

  let output = gui.addFolder('Output')
  output.add(guiState.output, 'showVideo')
  output.add(guiState.output, 'showSkeleton')
  output.add(guiState.output, 'showPoints')
  output.add(guiState.output, 'showBoundingBox')
  output.add(guiState.output, 'showZones')

  architectureController.onChange(function (architecture) {
    guiState.changeToArchitecture = architecture
  })

  algorithmController.onChange(function (value) {
    switch (guiState.algorithm) {
      case 'single-pose':
        multi.close()
        single.open()
        break
      case 'multi-pose':
        single.close()
        multi.open()
        break
    }
  })

  midiDeviceController.onChange(function (value) {
    setPreferredDevice(guiState.midiDevice)
  })

  gui.close()
}
