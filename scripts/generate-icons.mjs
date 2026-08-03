import sharp from 'sharp'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const svgPath = join(process.cwd(), 'public/icons/toolkit.svg')
const outputDir = join(process.cwd(), 'src-tauri/icons')

if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true })
}

async function generateIcons() {
  const svgBuffer = await sharp(svgPath).toBuffer()

  // Generate PNG icons at required sizes
  const sizes = [32, 128, 256]
  for (const size of sizes) {
    const suffix = size === 256 ? '@2x' : ''
    const filename = size === 256 ? `128x128@2x.png` : `${size}x${size}.png`
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(outputDir, filename))
    console.log(`Generated ${filename}`)
  }

  // Generate ICO file (Windows) - combine multiple sizes
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoBuffers = await Promise.all(
    icoSizes.map(async (size) => {
      return await sharp(svgBuffer).resize(size, size).png().toBuffer()
    })
  )

  // ICO format: header (6 bytes) + directory entries (16 bytes each) + image data
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // Reserved
  header.writeUInt16LE(1, 2) // Type: ICO
  header.writeUInt16LE(icoSizes.length, 4) // Number of images

  let dataOffset = 6 + (icoSizes.length * 16)
  const directoryEntries = []
  const imageData = []

  for (let i = 0; i < icoSizes.length; i++) {
    const size = icoSizes[i]
    const buffer = icoBuffers[i]
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size > 255 ? 0 : size, 0) // Width
    entry.writeUInt8(size > 255 ? 0 : size, 1) // Height
    entry.writeUInt8(0, 2) // Color palette
    entry.writeUInt8(0, 3) // Reserved
    entry.writeUInt16LE(1, 4) // Color planes
    entry.writeUInt16LE(32, 6) // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8) // Image size
    entry.writeUInt32LE(dataOffset, 12) // Image offset
    directoryEntries.push(entry)
    imageData.push(buffer)
    dataOffset += buffer.length
  }

  const icoBuffer = Buffer.concat([header, ...directoryEntries, ...imageData])
  writeFileSync(join(outputDir, 'icon.ico'), icoBuffer)
  console.log('Generated icon.ico')

  // Generate ICNS file (macOS) - simplified version with PNG data
  // ICNS format: magic (4 bytes) + file size (4 bytes) + icon entries
  const icnsEntries = []

  // ic07 = 128x128 PNG
  const png128 = await sharp(svgBuffer).resize(128, 128).png().toBuffer()
  const ic07Header = Buffer.alloc(8)
  ic07Header.write('ic07', 0)
  ic07Header.writeUInt32BE(8 + png128.length, 4)
  icnsEntries.push(Buffer.concat([ic07Header, png128]))

  // ic08 = 256x256 PNG
  const png256 = await sharp(svgBuffer).resize(256, 256).png().toBuffer()
  const ic08Header = Buffer.alloc(8)
  ic08Header.write('ic08', 0)
  ic08Header.writeUInt32BE(8 + png256.length, 4)
  icnsEntries.push(Buffer.concat([ic08Header, png256]))

  // ic09 = 512x512 PNG
  const png512 = await sharp(svgBuffer).resize(512, 512).png().toBuffer()
  const ic09Header = Buffer.alloc(8)
  ic09Header.write('ic09', 0)
  ic09Header.writeUInt32BE(8 + png512.length, 4)
  icnsEntries.push(Buffer.concat([ic09Header, png512]))

  const icnsData = Buffer.concat(icnsEntries)
  const icnsHeader = Buffer.alloc(8)
  icnsHeader.write('icns', 0)
  icnsHeader.writeUInt32BE(8 + icnsData.length, 4)
  const icnsBuffer = Buffer.concat([icnsHeader, icnsData])
  writeFileSync(join(outputDir, 'icon.icns'), icnsBuffer)
  console.log('Generated icon.icns')

  console.log('All icons generated successfully!')
}

generateIcons().catch(console.error)
