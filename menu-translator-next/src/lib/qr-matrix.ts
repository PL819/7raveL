/**
 * Pure TypeScript QR Code generator (Version 1-10, Error Correction Level L/M)
 * Generates an SVG path string from any URL without external dependencies.
 */

// QR Code Constants
const PAD0 = 0xec
const PAD1 = 0x11

// Galois Field GF(256) tables for Reed-Solomon error correction
const EXP: number[] = new Array(512)
const LOG: number[] = new Array(256)

;(function initGF() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    EXP[i] = x
    EXP[i + 255] = x
    LOG[x] = i
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0)
  }
  LOG[0] = 0
})()

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return EXP[LOG[a] + LOG[b]]
}

// Reed-Solomon generator polynomial for degree `n`
function getGeneratorPoly(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0)
    const factor = EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gmul(poly[j], factor)
    }
    poly = next
  }
  return poly
}

function calculateECC(data: number[], eccLength: number): number[] {
  const gen = getGeneratorPoly(eccLength)
  const res = new Array(eccLength).fill(0)

  for (const byte of data) {
    const factor = byte ^ res[0]
    res.shift()
    res.push(0)
    for (let i = 0; i < eccLength; i++) {
      res[i] ^= gmul(gen[i + 1], factor)
    }
  }
  return res
}

// Version table for byte mode (Level L & M)
interface VersionCap {
  version: number
  totalCodewords: number
  eccCodewords: number
  dataBytesL: number
  dataBytesM: number
  alignmentPositions: number[]
}

const VERSIONS: VersionCap[] = [
  { version: 1, totalCodewords: 26, eccCodewords: 7, dataBytesL: 19, dataBytesM: 16, alignmentPositions: [] },
  { version: 2, totalCodewords: 44, eccCodewords: 10, dataBytesL: 34, dataBytesM: 28, alignmentPositions: [6, 18] },
  { version: 3, totalCodewords: 70, eccCodewords: 15, dataBytesL: 55, dataBytesM: 44, alignmentPositions: [6, 22] },
  { version: 4, totalCodewords: 100, eccCodewords: 20, dataBytesL: 80, dataBytesM: 64, alignmentPositions: [6, 26] },
  { version: 5, totalCodewords: 134, eccCodewords: 26, dataBytesL: 108, dataBytesM: 86, alignmentPositions: [6, 30] },
  { version: 6, totalCodewords: 172, eccCodewords: 36, dataBytesL: 136, dataBytesM: 108, alignmentPositions: [6, 34] },
  { version: 7, totalCodewords: 196, eccCodewords: 40, dataBytesL: 156, dataBytesM: 124, alignmentPositions: [6, 22, 38] },
  { version: 8, totalCodewords: 242, eccCodewords: 48, dataBytesL: 194, dataBytesM: 154, alignmentPositions: [6, 24, 42] },
]

export function generateQrMatrix(text: string): boolean[][] {
  const utf8Bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code < 0x80) {
      utf8Bytes.push(code)
    } else if (code < 0x800) {
      utf8Bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      utf8Bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      )
    }
  }

  // Find lowest version that fits utf8Bytes
  let chosenVersion = VERSIONS[0]
  for (const v of VERSIONS) {
    if (utf8Bytes.length <= v.dataBytesM - 2) {
      chosenVersion = v
      break
    }
    chosenVersion = v
  }

  const { version, totalCodewords, dataBytesM, alignmentPositions } = chosenVersion
  const eccLength = totalCodewords - dataBytesM
  const size = 17 + 4 * version

  // Build bit stream: [Mode: 0100 (Byte)] [Count: 8 bits] [Bytes] [Terminator]
  const bits: number[] = []
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  pushBits(0b0100, 4) // 8-bit byte mode
  pushBits(utf8Bytes.length, version <= 9 ? 8 : 16)
  for (const b of utf8Bytes) {
    pushBits(b, 8)
  }

  // 4 zero bits terminator
  const maxBits = dataBytesM * 8
  const termLen = Math.min(4, maxBits - bits.length)
  pushBits(0, termLen)

  // Align to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Convert bits to data bytes
  const dataBytes: number[] = []
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | bits[i + j]
    }
    dataBytes.push(b)
  }

  // Pad to max data bytes
  let padToggle = false
  while (dataBytes.length < dataBytesM) {
    dataBytes.push(padToggle ? PAD1 : PAD0)
    padToggle = !padToggle
  }

  // Calculate ECC codewords
  const eccBytes = calculateECC(dataBytes, eccLength)
  const allCodewords = [...dataBytes, ...eccBytes]

  // Create empty matrix (null = unassigned)
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null),
  )

  // 1. Finder patterns (7x7) + separators
  function drawFinder(row: number, col: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r
        const nc = col + c
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          matrix[nr][nc] = true
        } else {
          matrix[nr][nc] = false
        }
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    const val = i % 2 === 0
    if (matrix[6][i] === null) matrix[6][i] = val
    if (matrix[i][6] === null) matrix[i][6] = val
  }

  // 3. Alignment patterns
  if (alignmentPositions.length > 0) {
    for (const r of alignmentPositions) {
      for (const c of alignmentPositions) {
        if (matrix[r][c] !== null) continue // Skip finder areas
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2
            const isCenter = dr === 0 && dc === 0
            matrix[r + dr][c + dc] = isBorder || isCenter
          }
        }
      }
    }
  }

  // 4. Dark module
  matrix[4 * version + 9][8] = true

  // 5. Reserve format info modules
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
    if (matrix[i][8] === null) matrix[i][8] = false
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[i][8] === null) matrix[i][8] = false
  }

  // 6. Place Data bits (zigzag pattern)
  const allBits: boolean[] = []
  for (const byte of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      allBits.push(((byte >> b) & 1) === 1)
    }
  }

  let bitIdx = 0
  let upward = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col-- // Skip vertical timing column
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i)

    for (const r of rows) {
      for (const c of [col, col - 1]) {
        if (matrix[r][c] === null) {
          const bitVal = bitIdx < allBits.length ? allBits[bitIdx++] : false
          // Apply standard mask pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0
          matrix[r][c] = bitVal !== mask
        }
      }
    }
    upward = !upward
  }

  // 7. Write Format Information (Level M + Mask 0 = 101010000010010 with mask 101010000010010 ^ 101010000010010)
  // Format bits for Level M (00) and Mask 0 (000): BCH code = 00000 1010011011 ^ 101010000010010 = 101011101011101
  const formatBits = [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1]

  // Top-left format info
  const formatCoordsTL: [number, number][] = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoordsTL[i]
    matrix[r][c] = formatBits[i] === 1
  }

  // Split format info
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = formatBits[i] === 1
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = formatBits[7 + i] === 1
  }

  return matrix.map((row) => row.map((cell) => cell ?? false))
}
