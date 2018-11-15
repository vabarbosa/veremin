/* global posenet */

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
export function drawSegment ([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath()
  ctx.moveTo(ax * scale, ay * scale)
  ctx.lineTo(bx * scale, by * scale)
  ctx.lineWidth = lineWidth
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
