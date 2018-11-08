
import {drawKeypoints, drawSkeleton, drawBoundingBox, drawBox, drawPoint} from './demo_util.js'
import {setPreferredDevice, sendMidiNote, getMidiDevices, computeNote} from './midi-connect.js'

const videoWidth = 800;
const videoHeight = 600;

const LEFTWRIST = 9
const RIGHTWRIST = 10
const qWidth = videoWidth * 0.5
const qHeight = videoHeight * 0.667

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}


/**
 * Loads a the camera to be used in the demo
 */
async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
  }

  const video = document.getElementById('video');
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight
    },
  });

  video.srcObject = stream;

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

let guiState = {
  midiDevice: 'browser',
  midiMessage: {
    leftNote: 70,
    leftVelocity: 75,
    rightNote: 70,
    rightVelocity: 75
  },
  input: {
    mobileNetArchitecture: isMobile() ? '0.50' : '0.75',
    outputStride: 16,
    imageScaleFactor: 0.5,
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5,
  },
  output: {
    showVideo: true,
    showSkeleton: true,
    showPoints: true,
    showBoundingBox: false,
    showNoteBox: true
  },
  net: null,
}

/**
 * Sets up dat.gui controller on the top-right of the window
 */
async function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }

  const gui = new dat.GUI({width: 300});

  const mOutputs = await getMidiDevices()
  let mouts = Object.keys(mOutputs)
  if (mouts.length > 0) {
    guiState.midiDevice = mouts[0]
    setPreferredDevice(mouts[0])
  }

  const midiDeviceController = gui.add(guiState, 'midiDevice', ['browser'].concat(mouts))

  let msgMidi = gui.addFolder("MIDI Message")
  msgMidi.add(guiState.midiMessage, 'leftNote', 0, 127).listen()
  msgMidi.add(guiState.midiMessage, 'rightNote', 0, 127).listen()
  msgMidi.add(guiState.midiMessage, 'leftVelocity', 0, 127).listen()
  msgMidi.add(guiState.midiMessage, 'rightVelocity', 0, 127).listen()
  msgMidi.open()

  // The input parameters have the most effect on accuracy and speed of the
  // network
  let input = gui.addFolder('Input');
  // Architecture: there are a few PoseNet models varying in size and
  // accuracy. 1.01 is the largest, but will be the slowest. 0.50 is the
  // fastest, but least accurate.
  const architectureController = input.add(
    guiState.input,
    'mobileNetArchitecture',
    ['1.01', '1.00', '0.75', '0.50']
  );
  // Output stride:  Internally, this parameter affects the height and width of
  // the layers in the neural network. The lower the value of the output stride
  // the higher the accuracy but slower the speed, the higher the value the
  // faster the speed but lower the accuracy.
  input.add(guiState.input, 'outputStride', [8, 16, 32]);
  // Image scale factor: What to scale the image by before feeding it through
  // the network.
  input.add(guiState.input, 'imageScaleFactor').min(0.2).max(1.0);
  // input.open();

  // Pose confidence: the overall confidence in the estimation of a person's
  // pose (i.e. a person detected in a frame)
  // Min part confidence: the confidence that a particular estimated keypoint
  // position is accurate (i.e. the elbow's position)
  let single = gui.addFolder('Single Pose Detection');
  single.add(guiState.singlePoseDetection, 'minPoseConfidence', 0.0, 1.0);
  single.add(guiState.singlePoseDetection, 'minPartConfidence', 0.0, 1.0);

  let output = gui.addFolder('Output');
  output.add(guiState.output, 'showVideo');
  output.add(guiState.output, 'showSkeleton');
  output.add(guiState.output, 'showPoints');
  output.add(guiState.output, 'showBoundingBox');
  output.add(guiState.output, 'showNoteBox');
  // output.open();

  architectureController.onChange(function(architecture) {
    guiState.changeToArchitecture = architecture;
  });

  midiDeviceController.onChange(function (value) {
    setPreferredDevice(guiState.midiDevice)
  })

  gui.close()
}


/**
 * Feeds an image to posenet to estimate poses - this is where the magic
 * happens. This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById('output');
  const ctx = canvas.getContext('2d');
  // since images are being fed from a webcam
  const flipHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();

      // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01
      // version
      guiState.net = await posenet.load(+guiState.changeToArchitecture);

      guiState.changeToArchitecture = null;
    }

    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor;
    const outputStride = +guiState.input.outputStride;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;

    const pose = await guiState.net.estimateSinglePose(
      video,
      imageScaleFactor,
      flipHorizontal,
      outputStride
    );
    poses.push(pose);

    minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
    minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    if (guiState.output.showNoteBox) {
      drawBox(qWidth, 10 , videoWidth-10, qHeight , ctx );
      drawBox(10, 10 , qWidth, qHeight , ctx );
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
 
    poses.forEach(({score, keypoints}) => {
      if (score >= minPoseConfidence) {
        const leftWrist = keypoints[LEFTWRIST]
        const rightWrist = keypoints[RIGHTWRIST]

        if (leftWrist.score > minPartConfidence
            && leftWrist.position.x >= qWidth
            && leftWrist.position.y <= qHeight) {

          if (rightWrist.score >  minPartConfidence
              && rightWrist.position.x <= qWidth
              && rightWrist.position.y <= qHeight) {

            let ynote1  = computeNote(rightWrist.position.y, 0, qHeight)       // NOTE- left wrist top-to-bottom
            let ynote2  = computeNote(leftWrist.position.y, 0, qHeight)        // NOTE- right wrist top-to-bottom
            let xvelo1 = Math.round(127 * (qWidth + rightWrist.position.x)/qWidth) - 127   // VELOCITY- left wrist left-to-right
            let xvelo2 = Math.round(127 * leftWrist.position.x/qWidth) - 127   // VELOCITY- right wrist left-to-right

            let xnote1 = computeNote(rightWrist.position.x, 0, qWidth)            // NOTE- left wrist left-to-right
            let xnote2 = computeNote((leftWrist.position.x - qWidth), 0, qWidth)  // NOTE- right wrist left-to-right
            let yvelo1 = 127 - Math.round(127 * rightWrist.position.y/qHeight)    // VELOCITY- left wrist top-to-bottom
            let yvelo2 = 127 - Math.round(127 * leftWrist.position.y/qHeight)     // VELOCITY- right wrist top-to-bottom

            // console.log(`ynote1=${ynote1}, ynote2=${ynote2}, xvelo1=${xvelo1}, xvelo2=${xvelo2}`)
            // console.log(`xnote1=${xnote1}, xnote2=${xnote2}, yvelo1=${yvelo1}, yvelo2=${yvelo2}`)

            guiState.midiMessage.leftNote = xnote1
            guiState.midiMessage.leftVelocity = yvelo1
            guiState.midiMessage.rightNote = xnote2
            guiState.midiMessage.rightVelocity = yvelo2

            sendMidiNote(xnote1, yvelo2)
            sendMidiNote(xnote2, yvelo2)
          }
        }
      
        if (guiState.output.showPoints) {
          drawKeypoints(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showSkeleton) {
          drawSkeleton(keypoints, minPartConfidence, ctx);
        }
        if (guiState.output.showBoundingBox) {
          drawBoundingBox(keypoints, ctx);
        }
      }
    });

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model, finding and loading
 * available camera devices, and setting off the detectPoseInRealTime function.
 */
async function bindPage() {
  // Load the PoseNet model weights with architecture 0.75
  const net = await posenet.load(0.75);

  document.getElementById('loading').style.display = 'none';
  document.getElementById('main').style.display = 'block';

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById('info');
    info.textContent = 'this browser does not support video capture,' +
        'or this device does not have a camera';
    info.style.display = 'block';
    throw e;
  }

  setupGui([], net);

  detectPoseInRealTime(video, net);
}

function setUserMedia() {
  navigator.getUserMedia = navigator.getUserMedia
    || navigator.webkitGetUserMedia
    || navigator.mozGetUserMedia;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    // setTimeout(function () {
      setUserMedia()
      getMidiDevices().then(bindPage)
    // }, 500)
  })
} else {
  setTimeout(function () {
    setUserMedia()
    getMidiDevices().then(bindPage)
  }, 500)
}
