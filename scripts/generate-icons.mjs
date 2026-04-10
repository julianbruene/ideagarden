// Run with: node scripts/generate-icons.mjs
// Requires: npm install canvas (only needed once for icon generation)
import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const r = size * 0.22 // corner radius

  // Background
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fillStyle = '#4A7C59'
  ctx.fill()

  const cx = size / 2
  const color = '#EDF2EF'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineCap = 'round'

  const s = size / 512

  // Stem
  ctx.lineWidth = 20 * s
  ctx.beginPath()
  ctx.moveTo(cx, 380 * s)
  ctx.lineTo(cx, 260 * s)
  ctx.stroke()

  // Left leaf
  ctx.beginPath()
  ctx.moveTo(cx, 290 * s)
  ctx.bezierCurveTo(cx, 290 * s, 180 * s, 260 * s, 160 * s, 190 * s)
  ctx.bezierCurveTo(200 * s, 185 * s, cx, 230 * s, cx, 290 * s)
  ctx.fill()

  // Right leaf
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(cx, 310 * s)
  ctx.bezierCurveTo(cx, 310 * s, 332 * s, 280 * s, 352 * s, 210 * s)
  ctx.bezierCurveTo(312 * s, 205 * s, cx, 250 * s, cx, 310 * s)
  ctx.fill()
  ctx.globalAlpha = 1

  // Sprout top
  ctx.beginPath()
  ctx.moveTo(cx, 260 * s)
  ctx.bezierCurveTo(cx, 220 * s, 240 * s, 190 * s, cx, 160 * s)
  ctx.bezierCurveTo(272 * s, 190 * s, cx, 220 * s, cx, 260 * s)
  ctx.fill()

  // Ground
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 16 * s
  ctx.beginPath()
  ctx.moveTo(180 * s, 380 * s)
  ctx.lineTo(332 * s, 380 * s)
  ctx.stroke()
  ctx.globalAlpha = 1

  return canvas.toBuffer('image/png')
}

writeFileSync('public/icon-192.png', drawIcon(192))
writeFileSync('public/icon-512.png', drawIcon(512))
writeFileSync('public/apple-touch-icon.png', drawIcon(180))
console.log('Icons generated: public/icon-192.png, icon-512.png, apple-touch-icon.png')
