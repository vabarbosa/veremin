
const isSafari = function () {
  const hasSafari = /Safari/i.test(navigator.userAgent)
  const hasChrome = /Chrome/i.test(navigator.userAgent)

  return hasSafari && !hasChrome
}

/**
 * Load the video camera
 *
 * @param {Node | String} domNode - DOM Node or id of the DOM Node to load video into (default: 'video')
 * @param {Boolean} mobile - True, if mobile device
 */
export async function loadVideo (domNode, mobile) {
  const video = await setupCamera(domNode, mobile)
  video.play()
  return video
}

/**
 * Set up the navigator media device
 *
 * @param {Node | String} domNode - DOM Node or id of the DOM Node to load video into (default: 'video')
 * @param {Boolean} mobile - True, if mobile device
 */
async function setupCamera (domNode = 'video', mobile) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available')
  }

  const video = typeof domNode === 'string' ? document.getElementById(domNode) : domNode

  const size = preferredVideoSize(null, mobile)
  video.width = size.width
  video.height = size.height
  const constraint = {
    audio: false,
    video: {
      facingMode: 'user'
    }
  }

  if (!isSafari()) {
    constraint.video.width = mobile ? undefined : size.width
    constraint.video.height = mobile ? undefined : size.height
  }

  video.srcObject = await navigator.mediaDevices.getUserMedia(constraint)

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video)
    }
  })
}

export const preferredVideoSize = function (video, mobile) {
  let size = {
    width: window.innerWidth,
    height: window.innerHeight
  }

  if (!mobile) {
    const w = Math.min(window.innerWidth, 1400)
    const h = Math.min(window.innerHeight, 1400)
    let vw = 800
    let vh = 600

    if (video) {
      vw = video.videoWidth || vw
      vh = video.videoHeight || vh
    }

    const videoRatio = vw / vh

    if (w / vw < h / vh) {
      const width = w < 400 ? w : (w < 600 ? w * 0.85 : w * 0.7)
      size = {
        width: width,
        height: width / videoRatio
      }
    } else {
      const height = h < 300 ? h : (h < 450 ? h * 0.85 : h * 0.7)
      size = {
        height: height,
        width: height * videoRatio
      }
    }
  }

  window.updateEnvInfo('video-size', `${Math.floor(size.width)}x${Math.floor(size.height)}`, 'Video size')
  return size
}
