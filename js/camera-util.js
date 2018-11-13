/**
 * Load the video camera
 *
 * @param {Node | String} domNode - DOM Node or id of the DOM Node to load video into (default: 'video')
 */
export async function loadVideo (domNode) {
  const video = await setupCamera(domNode)
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

  const size = preferredVideoSize()
  video.width = size.width
  video.height = size.height

  video.srcObject = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : size.width,
      height: mobile ? undefined : size.height
    }
  })

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video)
    }
  })
}

export const preferredVideoSize = function (video) {
  const w = Math.min(window.innerWidth, 1400)
  const h = Math.min(window.innerHeight, 1400)
  let vw = 800
  let vh = 600
  let size = {}

  if (video) {
    vw = video.videoWidth
    vh = video.videoHeight
  }

  const videoRatio = vw / vh

  if (w / vw < h / vh) {
    let width = w < 400 ? w : (w < 600 ? w * 0.85 : w * 0.7)
    size = {
      width: width,
      height: width / videoRatio
    }
  } else {
    let height = h < 300 ? h : (h < 450 ? h * 0.85 : h * 0.7)
    size = {
      height: height,
      width: height * videoRatio
    }
  }

  // console.log(size)
  return size
}
