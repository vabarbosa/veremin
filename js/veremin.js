/* global posenet, requestAnimationFrame */

import { loadVideo } from './camera-util.js'
import { sendMidiNote, getMidiDevices, computeNote, computeVelocity } from './midi-connect.js'
import { drawKeypoints, drawSkeleton, drawBoundingBox, drawBox } from './canvas-overlay.js'
import { guiState, setupGui } from './control-panel.js'
import { chords } from './chord-intervals.js'

const VIDEOWIDTH = 800
const VIDEOHEIGHT = 600

const LEFTWRIST = 9
const RIGHTWRIST = 10
const ZONEWIDTH = VIDEOWIDTH * 0.5
const ZONEHEIGHT = VIDEOHEIGHT * 0.667
const ZONEOFFSET = 10

let posenetModel = null

const isMobile = function () {
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  return isAndroid || isiOS
}

const setUserMedia = function () {
  navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic happens.
 * This function loops with a requestAnimationFrame method.
 */
const detectPoseInRealTime = function (video) {
  const canvas = document.getElementById('output')
  const canvasCtx = canvas.getContext('2d')
  const flipHorizontal = true // since images are being fed from a webcam

  canvas.width = VIDEOWIDTH
  canvas.height = VIDEOHEIGHT

  async function poseDetectionFrame () {
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      posenetModel.dispose()

      // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01 version
      posenetModel = await posenet.load(+guiState.changeToArchitecture)

      guiState.changeToArchitecture = null
    }

    // Scale an image down to a certain factor.
    // Too large of an image will slow down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor
    const outputStride = +guiState.input.outputStride

    let poses = []
    let minPoseConfidence
    let minPartConfidence

    switch (guiState.algorithm) {
      case 'single-pose':
        const pose = await posenetModel.estimateSinglePose(
          video,
          imageScaleFactor,
          flipHorizontal,
          outputStride
        )
        poses.push(pose)

        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence
        break
      case 'multi-pose':
        poses = await posenetModel.estimateMultiplePoses(
          video,
          imageScaleFactor,
          flipHorizontal,
          outputStride,
          guiState.multiPoseDetection.maxPoseDetections,
          guiState.multiPoseDetection.minPartConfidence,
          guiState.multiPoseDetection.nmsRadius
        )

        minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence
        minPartConfidence = +guiState.multiPoseDetection.minPartConfidence
        break
    }

    canvasCtx.clearRect(0, 0, VIDEOWIDTH, VIDEOHEIGHT)

    if (guiState.output.showVideo) {
      canvasCtx.save()
      canvasCtx.scale(-1, 1)
      canvasCtx.translate(-VIDEOWIDTH, 0)
      canvasCtx.drawImage(video, 0, 0, VIDEOWIDTH, VIDEOHEIGHT)
      canvasCtx.restore()
    }

    if (guiState.output.showZones) {
      // draw left zone
      drawBox(ZONEOFFSET, ZONEOFFSET, ZONEWIDTH, ZONEHEIGHT, canvasCtx)
      // draw right zone
      drawBox(ZONEWIDTH, ZONEOFFSET, VIDEOWIDTH - ZONEOFFSET, ZONEHEIGHT, canvasCtx)
    }

    // For each pose (i.e. person) detected in an image, loop through the poses and
    // draw the resulting skeleton and keypoints if over certain confidence scores
    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        const leftWrist = keypoints[LEFTWRIST]
        const rightWrist = keypoints[RIGHTWRIST]

        if (leftWrist.score > minPartConfidence && rightWrist.score > minPartConfidence) {
          // Convert keypoints to MIDI data
          const mididata = convertToMIDI(leftWrist, rightWrist)

          // send MIDI data
          mididata.forEach(data => {
            if (data && data.length === 2) {
              sendMidiNote(data[0], data[1], guiState.noteDuration)
            }
          })
        }

        if (guiState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, canvasCtx)
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, canvasCtx)
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, canvasCtx)
        }
      }
    })

    requestAnimationFrame(poseDetectionFrame)
  }

  poseDetectionFrame()
}

/**
 * Convert wrist positions to MIDI note and velocity.
 * Returns an array with note and velocity values (i.e., [note, velocity])
 *
 * @param {Object} leftWrist - posenet 'leftWrist' keypoints (corresponds to user's right hand)
 * @param {Object} rightWrist - posenet 'rightWrist' keypoints (corresponds to user's left hand)
 */
const convertToMIDI = function (leftWrist, rightWrist) {
  const leftZone = rightWrist.position
  const rightZone = leftWrist.position

  const leftEdge = ZONEOFFSET
  const verticalSplit = ZONEWIDTH
  const rightEdge = VIDEOWIDTH - ZONEOFFSET
  const topEdge = ZONEOFFSET
  const bottomEdge = ZONEHEIGHT

  let midiData = []

  if (rightZone.x >= verticalSplit && rightZone.x <= rightEdge &&
      rightZone.y <= bottomEdge && rightZone.y >= topEdge &&
      leftZone.x >= leftEdge && leftZone.x <= verticalSplit &&
      leftZone.y <= bottomEdge && leftZone.y >= topEdge) {
    // vertical scale (both zones):   low-to-high => bottomEdge-to-topEdge
    // horizontal scale (left zone):  low-to-high => verticalSplit-to-leftEdge
    // horizontal scale (right zone): low-to-high => verticalSplit-to-rightEdge

    let chordsArray = []
    if (guiState.chordIntervals !== 'default' && chords.hasOwnProperty(guiState.chordIntervals)) {
      chordsArray = chords[guiState.chordIntervals]
    }

    const leftHorVelo = computeVelocity(leftZone.x, verticalSplit, leftEdge)
    // const rightHorVelo = computeVelocity(rightZone.x, verticalSplit, rightEdge)
    // const leftVertNote = computeNote(leftZone.y, bottomEdge, topEdge, chordsArray)
    const rightVertNote = computeNote(rightZone.y, bottomEdge, topEdge, chordsArray)

    // console.log(`${leftHorVelo}=leftHorVelo, ${rightVertNote}=rightVertNote`)

    guiState.midiData.Velocity = leftHorVelo
    guiState.midiData.Note = rightVertNote[0]

    rightVertNote.forEach(note => {
      midiData.push([ note, leftHorVelo ])
    })
  }

  return midiData
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
const bindPage = async function () {
  posenetModel = await posenet.load(0.75) // load the PoseNet with architecture 0.75

  document.getElementById('loading').style.display = 'none'
  document.getElementById('main').style.display = 'block'

  const mobile = isMobile()
  let video

  try {
    video = await loadVideo('video', VIDEOWIDTH, VIDEOHEIGHT, mobile)
  } catch (e) {
    let info = document.getElementById('info')
    info.textContent = 'Browser does not support video capture or this device does not have a camera'
    info.style.display = 'block'
    throw e
  }

  await setupGui([], mobile)
  detectPoseInRealTime(video)
}

// run the app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    setUserMedia()
    getMidiDevices().then(bindPage)
  })
} else {
  setTimeout(function () {
    setUserMedia()
    getMidiDevices().then(bindPage)
  }, 500)
}
