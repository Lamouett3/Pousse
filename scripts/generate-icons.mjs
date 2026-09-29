#!/usr/bin/env node
// One-shot script to generate PWA icons from icon.svg
// Run: node scripts/generate-icons.mjs
// Can be deleted after icons are generated.

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/icon.svg')
const outDir = resolve(__dirname, '../public/icons')

const svg = readFileSync(svgPath)

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, name))
  console.log(`✓ ${name} (${size}×${size})`)
}
