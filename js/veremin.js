/* global tf, posenet, requestAnimationFrame, performance, updateEnvInfo, toggleVeremin */

import { loadVideo, preferredVideoSize } from './camera-util.js'
import { playNote, getMidiDevices, getAnalyzerValue } from './audio-controller.js'
import { drawKeypoints, drawSkeleton, drawBox, drawWave, drawScale, drawText } from './canvas-overlay.js'
import { guiState, setupGui } from './control-panel.js'
import { chords } from './chord-intervals.js'
import { MqttClient } from './mqtt-manager.js'

const isMobile = function () {
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  return isAndroid || isiOS
}

let VIDEOWIDTH = 800
let VIDEOHEIGHT = 600

const ZONEOFFSET = 10
const ZONEFACTOR = isMobile() ? 0.5 : 0.7
let ZONEWIDTH = VIDEOWIDTH * 0.5
let ZONEHEIGHT = VIDEOHEIGHT * ZONEFACTOR

const LEFTWRIST = 9
const RIGHTWRIST = 10
const NOSE = 0
const LEFTSHOULDER = 5
const RIGHTSHOULDER = 6

let paused = false
let posenetModel = null

let mqttClient = null

let fpsTime = 0
let fpsFrames = 0
let fps = '--'
const computeFPS = function () {
  fpsFrames++
  const currentTime = (performance || Date).now()

  if (currentTime >= fpsTime + 1000) {
    fps = Math.round((fpsFrames * 1000) / (currentTime - fpsTime))
    fpsTime = currentTime
    fpsFrames = 0
  }
  return fps
}

const resetVideoCanvasSize = function (video, canvas) {
  const size = preferredVideoSize(video, isMobile())

  VIDEOWIDTH = size.width
  VIDEOHEIGHT = size.height
  ZONEWIDTH = VIDEOWIDTH * 0.5
  ZONEHEIGHT = VIDEOHEIGHT * ZONEFACTOR

  if (canvas) {
    canvas.setAttribute('width', VIDEOWIDTH)
    canvas.setAttribute('height', VIDEOHEIGHT)
    video.setAttribute('width', VIDEOWIDTH)
    video.setAttribute('height', VIDEOHEIGHT)
  }
}

const resize = function () {
  const canvas = document.getElementById('output')
  const video = document.getElementById('video')
  resetVideoCanvasSize(video, canvas)
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic happens.
 * This function loops with a requestAnimationFrame method.
 */
const detectPoseInRealTime = function (video) {
  const canvas = document.getElementById('output')
  const canvasCtx = canvas.getContext('2d')
  const flipHorizontal = true // since images are being fed from a webcam
  const waveCtx = document.getElementById('wave').getContext('2d')

  resetVideoCanvasSize(video)
  canvas.width = VIDEOWIDTH
  canvas.height = VIDEOHEIGHT

  async function poseDetectionFrame () {
    if (!paused) {
      if (guiState.changeToArchitecture) {
        // Important to purge variables and free up GPU memory
        posenetModel.dispose()

        // Load the PoseNet model weights for changed architecture
        posenetModel = await posenet.load({
          architecture: guiState.changeToArchitecture,
          outputStride: guiState.outputStride,
          inputResolution: guiState.inputResolution,
          multiplier: guiState.multiplier
        })

        guiState.architecture = guiState.changeToArchitecture
        guiState.changeToArchitecture = null
      }

      let poses = []
      let minPoseConfidence
      let minPartConfidence

      switch (guiState.algorithm) {
        case 'single-pose':
          const pose = await posenetModel.estimateSinglePose(
            video, {
              flipHorizontal: flipHorizontal,
              decodingMethod: 'single-person'
            }
          )
          poses.push(pose)

          minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence
          minPartConfidence = +guiState.singlePoseDetection.minPartConfidence
          break
        case 'multi-pose':
          poses = await posenetModel.estimateMultiplePoses(
            video, {
              flipHorizontal: flipHorizontal,
              decodingMethod: 'multi-person',
              maxDetections: guiState.multiPoseDetection.maxPoseDetections,
              scoreThreshold: guiState.multiPoseDetection.minPartConfidence,
              nmsRadius: guiState.multiPoseDetection.nmsRadius
            }
          )

          minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence
          minPartConfidence = +guiState.multiPoseDetection.minPartConfidence
          break
      }

      canvasCtx.clearRect(0, 0, VIDEOWIDTH, VIDEOHEIGHT)

      const topOffset = ZONEHEIGHT - (ZONEHEIGHT * guiState.notesRangeScale) + ZONEOFFSET
      const notesOffset = (ZONEHEIGHT - topOffset) * guiState.notesRangeOffset

      const chordsInterval = guiState.chordIntervals === 'default' ? null : guiState.chordIntervals
      let chordsArray = []
      if (chordsInterval &&
          chordsInterval !== 'default' &&
          Object.prototype.hasOwnProperty.call(chords, chordsInterval)) {
        chordsArray = chords[chordsInterval]
      }

      if (guiState.canvas.showVideo) {
        canvasCtx.save()
        canvasCtx.scale(-1, 1)
        canvasCtx.translate(-VIDEOWIDTH, 0)
        canvasCtx.drawImage(video, 0, 0, VIDEOWIDTH, VIDEOHEIGHT)
        canvasCtx.restore()
      }

      if (guiState.canvas.showZones) {
        // draw left zone
        drawBox(ZONEOFFSET, ZONEOFFSET, ZONEWIDTH, ZONEHEIGHT, canvasCtx)
        // draw right zone
        drawBox(ZONEWIDTH, ZONEOFFSET, VIDEOWIDTH - ZONEOFFSET, ZONEHEIGHT, canvasCtx)
        // draw notes range scale
        drawScale(
          (VIDEOWIDTH - ZONEOFFSET),
          (topOffset + notesOffset),
          (VIDEOWIDTH - ZONEOFFSET),
          (ZONEHEIGHT + notesOffset),
          (chordsArray.length || 100),
          canvasCtx,
          [ZONEOFFSET, ZONEHEIGHT])
      }

      // If we don't have an mqtt client or if the gui says on, but the client isn't
      // enabled, as in we are transitioning into the on state, reset the mqtt clients params
      if (!mqttClient || (guiState.mqtt.on && !mqttClient.getEnabled())) {
        mqttClient = new MqttClient(
          guiState.mqtt.brokerURL,
          guiState.mqtt.brokerPort,
          guiState.mqtt
        )
      }

      mqttClient.setShouldLog(guiState.mqtt.log)
      mqttClient.setMqttEnabled(guiState.mqtt.on)

      // Loop through each pose (i.e. person) detected
      poses.forEach(({ score, keypoints }) => {
        if (score >= minPoseConfidence) {
          processPose(score, keypoints, minPartConfidence, topOffset, notesOffset, chordsArray, canvasCtx)
        }
      })

      if (guiState.canvas.showWaveform) {
        const value = getAnalyzerValue()
        drawWave(value, waveCtx)
      }

      // update frames per second
      if (guiState.canvas.showFPS) {
        drawText(`${computeFPS()} FPS`, (VIDEOWIDTH - ZONEOFFSET), (VIDEOHEIGHT - ZONEOFFSET), 'right', canvasCtx)
      }
    }

    requestAnimationFrame(poseDetectionFrame)
  }

  poseDetectionFrame()
}

/**
 *
 * @param {Number} noseXPercent - The percentage of one half of the screen the user is to the left or the right
 * of the middle dividing line
 * This assumes that the FOV of the camera being used is 120 degrees. This is the standard angle for most cameras so it seems relatively safe.
 */
const calculateAngle = function (noseXPercent) {
  let data = { rotateLeft: 0 }
  if (noseXPercent < 0) {
    data = { rotateRight: 0 }
    data.rotateRight = noseXPercent * -1 * guiState.mqtt.cameraFOV / 2
  } else {
    data.rotateLeft = noseXPercent * guiState.mqtt.cameraFOV / 2
  }
  return data
}

/**
 * Draw the resulting skeleton and keypoints and send data to play corresponding note
 */
const processPose = function (score, keypoints, minPartConfidence, topOffset, notesOffset, chordsArray, canvasCtx) {
  const leftWrist = keypoints[LEFTWRIST]
  const rightWrist = keypoints[RIGHTWRIST]
  const nose = keypoints[NOSE]
  const leftShoulder = keypoints[LEFTSHOULDER]
  const rightShoulder = keypoints[RIGHTSHOULDER]

  if (leftWrist.score > minPartConfidence && rightWrist.score > minPartConfidence) {
    // Normalize keypoints to values between 0 and 1 (horizontally & vertically)
    const position = normalizeMusicPositions(leftWrist, rightWrist, (topOffset + notesOffset), (ZONEHEIGHT + notesOffset))

    if (position.right.vertical > 0 && position.left.horizontal > 0) {
      playNote(
        position.right.vertical, // note
        position.left.horizontal, // volume
        guiState.noteDuration,
        chordsArray
      )
    } else {
      playNote(0, 0)
    }
  } else {
    playNote(0, 0)
  }

  if (guiState.mqtt.on) {
    let userPosition = {}
    if (nose.score > minPartConfidence && leftShoulder.score > minPartConfidence && rightShoulder.score > minPartConfidence) {
      userPosition = normalizeUserPlacementPositions(leftShoulder, rightShoulder, nose, (topOffset + notesOffset), (ZONEHEIGHT + notesOffset))
      mqttClient.sendNose(userPosition.nose)
      const userAngle = calculateAngle(userPosition.nose.x)
      mqttClient.sendAngle(userAngle)

      // .5 meters is 50%-52% of the screen
      // 1 meter is 27 -> 29% of the screen
      // 1.5 meters is 20->21%
      // 2 meters is 16 to 17%
      // 2.5 meters projection is 13 -> 15
      // This is likely overfitting in some capacity but it should be fine for our purposes
      const estimatedDist = guiState.mqtt.distanceMult * 60.873 * (100 * userPosition.shoulderWidthPercent) ** -1.225
      mqttClient.sendEstDist(estimatedDist)
      const estWristDelta = {
        left: {
          x: keypoints[LEFTWRIST].position.x - keypoints[LEFTSHOULDER].position.x,
          y: keypoints[LEFTWRIST].position.y - keypoints[LEFTSHOULDER].position.y,
          conf: keypoints[LEFTWRIST].score
        }, 
         right: {
          x: keypoints[RIGHTWRIST].position.x - keypoints[RIGHTSHOULDER].position.x,
          y: keypoints[RIGHTWRIST].position.y - keypoints[RIGHTSHOULDER].position.y,
          conf: keypoints[RIGHTWRIST].score
          }
        }
        const robotData = {
          wristDelta: estWristDelta,
          nose: userPosition.nose,
          userAngle: userAngle,
          userDist: estimatedDist,
        }
    
        mqttClient.sendRobot(robotData)
    }

    mqttClient.sendKeypoints(keypoints)
  }

  if (guiState.canvas.showPoints) {
    drawKeypoints(keypoints, minPartConfidence, canvasCtx)
  }
  if (guiState.canvas.showSkeleton) {
    drawSkeleton(keypoints, minPartConfidence, canvasCtx)
  }
}

/**
 * Returns an object with the users position data for their nose, and shoulders between 0 and 1 such that we can calculate how the robot
 * watching for this data should move
 *
 * @param {Object} leftShoulder  - posenet 'leftshoulder' keypoint corresponding to the users left shoulder
 * @param {Object} rightShoulder - posenet 'rightshoulder' keypoint corresponding to users right shoulder
 * @param {Object} nose - posenet 'nose' keypoints (corresponding to the user's nose)
 * @param {Object} topOffset - top edge (max position) for computing the edge of the screen
 * @param {Object} bottomOffset - bottom edge (min position) for computing jthe edge of the video screen
 */
const normalizeUserPlacementPositions = function (
  leftShoulder, rightShoulder, nose,
  topOffset = ZONEOFFSET, bottomOffset = ZONEHEIGHT
) {
  const leftEdge = ZONEOFFSET
  const verticalSplit = ZONEWIDTH
  const rightEdge = VIDEOWIDTH - ZONEOFFSET
  const shoulderWidth = rightShoulder.position.x - leftShoulder.position.x

  // shoulderWidthPercent is the percentage of the horizontal screen width the users shoulders take up
  const position = {
    shoulderWidthPercent: 0,
    nose: {
      x: 0,
      y: 0
    }
  }

  if (nose.position.x >= verticalSplit && nose.position.x <= rightEdge) {
    position.nose.x = computePercentage(nose.position.x, verticalSplit, rightEdge)
  } else if (nose.position.x <= verticalSplit && nose.position.x >= leftEdge) {
    position.nose.x = computePercentage(nose.position.x, leftEdge, verticalSplit) - 1
  }
  if (nose.position.y <= ZONEHEIGHT && nose.position.y >= ZONEOFFSET) {
    position.nose.y = computePercentage(nose.position.y, ZONEHEIGHT, ZONEOFFSET)
  }

  if (leftShoulder.position.x <= rightEdge &&
      leftShoulder.position.x >= leftEdge &&
      rightShoulder.position.x <= rightEdge &&
      rightShoulder.position.x >= leftEdge) {
    position.shoulderWidthPercent = computePercentage(shoulderWidth, 0, rightEdge - leftEdge)
  }

  return position
}

/**
 * Returns an object the horizontal and vertical positions of left and right wrist normalized between 0 and 1
 *
 * @param {Object} leftWrist - posenet 'leftWrist' keypoints (corresponds to user's right hand)
 * @param {Object} rightWrist - posenet 'rightWrist' keypoints (corresponds to user's left hand)
 * @param {Number} notesTopOffset - top edge (max position) for computing vertical notes
 */
const normalizeMusicPositions = function (leftWrist, rightWrist, topOffset = ZONEOFFSET, bottomOffset = ZONEHEIGHT) {
  const leftZone = leftWrist.position
  const rightZone = rightWrist.position

  const leftEdge = ZONEOFFSET
  const verticalSplit = ZONEWIDTH
  const rightEdge = VIDEOWIDTH - ZONEOFFSET
  const topEdge = topOffset
  const bottomEdge = bottomOffset

  const position = {
    right: {
      vertical: 0,
      horizontal: 0
    },
    left: {
      vertical: 0,
      horizontal: 0
    }
  }

  if (rightZone.x >= verticalSplit && rightZone.x <= rightEdge) {
    position.right.horizontal = computePercentage(rightZone.x, verticalSplit, rightEdge)
  }
  if (rightZone.y <= ZONEHEIGHT && rightZone.y >= ZONEOFFSET) {
    position.right.vertical = computePercentage(rightZone.y, bottomEdge, topEdge)
  }
  if (leftZone.x >= leftEdge && leftZone.x <= verticalSplit) {
    position.left.horizontal = computePercentage(leftZone.x, verticalSplit, leftEdge)
  }
  if (leftZone.y <= ZONEHEIGHT && leftZone.y >= ZONEOFFSET) {
    position.left.vertical = computePercentage(leftZone.y, ZONEHEIGHT, ZONEOFFSET)
  }

  return position
}

/**
 * Compute percentage of the provided value in the given range
 *
 * @param {Number} value - a number between 'low' and 'high' to compute percentage
 * @param {Number} low - corresponds to a number that should produce value 0
 * @param {Number} high - corresponds to a number that should produce value 1
 */
const computePercentage = function (value, low, high) {
  const dist = isNaN(value) ? 0 : value
  const minDist = isNaN(low) ? 0 : low
  const maxDist = isNaN(high) ? dist + 1 : high

  return (dist - minDist) / (maxDist - minDist)
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
const bindPage = async function () {
  window.onresize = resize
  posenetModel = await posenet.load()

  const body = document.getElementsByTagName('body')[0]

  const mobile = isMobile()
  let video

  try {
    video = await loadVideo('video', mobile)
    await setupGui([], mobile)
    body.className = 'ready'
    resize()
    toggleVeremin()
    detectPoseInRealTime(video)
  } catch (e) {
    body.className = 'error'
    const info = document.getElementById('msg')
    info.textContent = 'Unable to access camera or video capture is not supported'
    updateEnvInfo('Error', e)
    throw e
  }
}

// toggle veremin on/off
window.toggleVeremin = function () {
  paused = !document.getElementById('toggle-checkbox').checked
  console.log(`${paused ? 'Pausing' : 'Resuming'} Veremin`)
  document.getElementById('v-status').innerText = paused ? '[stopped]' : ''
}

// update environment info
window.updateEnvInfo = function (id, value, label) {
  const param = document.getElementById(id)
  if (param) {
    param.textContent = value
  } else {
    const dt = document.createElement('dt')
    dt.textContent = label || id
    const dd = document.createElement('dd')
    dd.id = id
    dd.textContent = value
    const dlist = document.getElementById('env-list')
    if (id.toLowerCase() === 'error') {
      dt.className = 'error'
      dd.className = 'error'
    }
    dlist.appendChild(dt)
    dlist.appendChild(dd)
  }
}

// init environment info
const initEnvInfo = function () {
  updateEnvInfo('location', window.location, 'Location')
  updateEnvInfo('user-agent', navigator.userAgent, 'User-Agent')
  updateEnvInfo('is-mobile', isMobile(), 'Mobile device')
  updateEnvInfo('tfjs-version', (tf ? tf.version.tfjs : 'Not available'), 'TensorFlow.js version')
  updateEnvInfo('media-devices', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), 'Web camera access')
  updateEnvInfo('web-audio', !!(window.AudioContext || window.webkitAudioContext), 'Web Audio API support')
  updateEnvInfo('web-midi', !!(navigator.requestMIDIAccess), 'Web MIDI API support')
}

// init the app
const init = function () {
  initEnvInfo()
  const waveCtx = document.getElementById('wave').getContext('2d')
  drawWave([], waveCtx)

  getMidiDevices().then(bindPage)
}

// run the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  setTimeout(init, 500)
}
