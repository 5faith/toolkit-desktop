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
  await sharp(svgBuffer).resize(32, 32).png().toFile(join(outputDir, '32x32.png'))
  console.log('Generated 32x32.png')

  await sharp(svgBuffer).resize(128, 128).png().toFile(join(outputDir, '128x128.png'))
  console.log('Generated 128x128.png')

  await sharp(svgBuffer).resize(256, 256).png().toFile(join(outputDir, '128x128@2x.png'))
  console.log('Generated 128x128@2x.png')

  // Generate ICO file using sharp's built-in ICO support
  const icoSizes = [16, 32, 48, 64, 128, 256]
  const icoBuffers = await Promise.all(
    icoSizes.map(size => sharp(svgBuffer).resize(size, size).png().toBuffer())
  )

  // ICO header: 6 bytes
  // Each directory entry: 16 bytes
  const headerSize = 6
  const entrySize = 16
  const entriesCount = icoSizes.length
  const dataOffset = headerSize + entriesCount * entrySize

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)       // Reserved
  header.writeUInt16LE(1, 2)       // Type: 1 = ICO
  header.writeUInt16LE(entriesCount, 4) // Count

  let currentOffset = dataOffset
  const entries = []
  for (let i = 0; i < entriesCount; i++) {
    const size = icoSizes[i]
    const buf = icoBuffers[i]
    const entry = Buffer.alloc(entrySize)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)  // Width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)  // Height
    entry.writeUInt8(0, 2)  // Color palette
    entry.writeUInt8(0, 3)  // Reserved
    entry.writeUInt16LE(1, 4)   // Color planes
    entry.writeUInt16LE(32, 6)  // Bits per pixel
    entry.writeUInt32LE(buf.length, 8)   // Image data size
    entry.writeUInt32LE(currentOffset, 12) // Image data offset
    entries.push(entry)
    currentOffset += buf.length
  }

  const icoFile = Buffer.concat([header, ...entries, ...icoBuffers])
  writeFileSync(join(outputDir, 'icon.ico'), icoFile)
  console.log('Generated icon.ico')

  // Generate ICNS file (macOS)
  const icnsParts = []

  const ic07 = await sharp(svgBuffer).resize(128, 128).png().toBuffer()
  const ic07Entry = Buffer.alloc(8)
  ic07Entry.write('ic07', 0)
  ic07Entry.writeUInt32BE(8 + ic07.length, 4)
  icnsParts.push(Buffer.concat([ic07Entry, ic07]))

  const ic08 = await sharp(svgBuffer).resize(256, 256).png().toBuffer()
  const ic08Entry = Buffer.alloc(8)
  ic08Entry.write('ic08', 0)
  ic08Entry.writeUInt32BE(8 + ic08.length, 4)
  icnsParts.push(Buffer.concat([ic08Entry, ic08]))

  const ic09 = await sharp(svgBuffer).resize(512, 512).png().toBuffer()
  const ic09Entry = Buffer.alloc(8)
  ic09Entry.write('ic09', 0)
  ic09Entry.writeUInt32BE(8 + ic09.length, 4)
  icnsParts.push(Buffer.concat([ic09Entry, ic09]))

  const icnsData = Buffer.concat(icnsParts)
  const icnsHeader = Buffer.alloc(8)
  icnsHeader.write('icns', 0)
  icnsHeader.writeUInt32BE(8 + icnsData.length, 4)
  writeFileSync(join(outputDir, 'icon.icns'), Buffer.concat([icnsHeader, icnsData]))
  console.log('Generated icon.icns')

  console.log('All icons generated!')
}

generateIcons().catch(console.error)
