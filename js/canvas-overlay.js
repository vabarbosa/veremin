/* global posenet */

const teal10 = '#dbfbfb'
const color = 'aqua'
const boundingBoxColor = 'red'
const lineWidth = 2

function toTuple ({ y, x }) {
  return [y, x]
}

/**
 * Draws a point on a canvas
 */
export function drawPoint (ctx, y, x, r, color) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
export function drawSegment ([ay, ax], [by, bx], color, scale, ctx, lw = lineWidth) {
  ctx.beginPath()
  ctx.moveTo(ax * scale, ay * scale)
  ctx.lineTo(bx * scale, by * scale)
  ctx.lineWidth = lw
  ctx.strokeStyle = color
  ctx.stroke()
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
export function drawSkeleton (keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence)

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
      toTuple(keypoints[0].position),
      toTuple(keypoints[1].position),
      color,
      scale,
      ctx
    )
  })
}

/**
 * Draw pose keypoints onto a canvas
 */
export function drawKeypoints (keypoints, minConfidence, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i]

    if (keypoint.score < minConfidence) {
      continue
    }

    const { y, x } = keypoint.position
    if (i === 10) {
      drawPoint(ctx, y * scale, x * scale, 6, 'red')
    } else if (i === 9) {
      drawPoint(ctx, y * scale, x * scale, 6, 'orange')
    } else {
      drawPoint(ctx, y * scale, x * scale, 3, color)
    }
  }
}

/**
 * Draw box onto a canvas
 */
export function drawBox (x1, y1, x2, y2, ctx) {
  ctx.rect(x1, y1, x2 - x1, y2 - y1)
  ctx.strokeStyle = boundingBoxColor
  ctx.stroke()
}

/**
 * Draw waveform onto a canvas
 */
export function drawWave (points, ctx) {
  const scale = function (val, low, high, min, max) {
    return (val - low) / (high - low) * (max - min) + min
  }

  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const m = 0.05 * h
  const pts = typeof points === 'object' && points.length ? points : [0, 0]
  const len = pts.length

  ctx.clearRect(0, 0, w, h)
  ctx.beginPath()
  ctx.moveTo(w, h)
  ctx.lineTo(0, h)

  for (let p = 0; p < len; p++) {
    const x = scale(p, 0, len - 1, 0, w)
    const y = scale(pts[p], -1, 1, h - m, m)

    ctx.lineTo(x, y)
  }

  ctx.lineTo(w, h)
  ctx.lineCap = 'round'
  ctx.fillStyle = teal10
  ctx.fill()
}

/**
 * Draw notes range scale onto a canvas
 */
export function drawScale (x1, y1, x2, y2, interval = 50, ctx, range) {
  if (y1 >= range[0]) {
    drawSegment([y1, x1 - 15], [y1, x2], 'black', 1, ctx, 1)
  }
  const s = (y2 - y1) / interval
  for (let j = 1; j < interval; j++) {
    const i = y1 + (s * j)
    if (i > range[0] && i < range[1]) {
      drawSegment([i, x1 - 10], [i, x2], (j % 12 === 0 ? 'black' : 'red'), 1, ctx, 1)
    }
  }
  if (y2 <= range[1]) {
    drawSegment([y2, x1 - 15], [y2, x2], 'black', 1, ctx, 1)
  }
}

/**
 * Draw text on the canvas
 */
export function drawText (text, x, y, align = 'start', ctx, color = 'red') {
  ctx.font = '16px Arial'
  ctx.textAlign = align
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}
