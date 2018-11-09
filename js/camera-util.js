/**
 * Load the video camera
 *
 * @param {Node | String} domNode - DOM Node or id of the DOM Node to load video into (default: 'video')
 * @param {Number} width - the width (in pixels) of the video (default: 800)
 * @param {Number} height - the height (in pixels) of the video (default: 600)
 */
export async function loadVideo (domNode, width, height) {
  const video = await setupCamera(domNode, width, height)
  video.play()
  return video
}

/**
 * Set up the navigator media device
 *
 * @param {Node | String} domNode - DOM Node or id of the DOM Node to load video into (default: 'video')
 * @param {Number} width - the width (in pixels) of the video (default: 800)
 * @param {Number} height - the height (in pixels) of the video (default: 600)
 * @param {Boolean} mobile - True, if mobile device
 */
async function setupCamera (domNode = 'video', width = 800, height = 600, mobile) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Browser API navigator.mediaDevices.getUserMedia not available')
  }

  const video = typeof domNode === 'string' ? document.getElementById(domNode) : domNode
  video.width = width
  video.height = height

  video.srcObject = await navigator.mediaDevices.getUserMedia({
    'audio': false,
    'video': {
      facingMode: 'user',
      width: mobile ? undefined : width,
      height: mobile ? undefined : height
    }
  })

  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video)
    }
  })
}
