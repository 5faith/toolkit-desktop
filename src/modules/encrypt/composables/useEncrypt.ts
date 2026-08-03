import { useNotification } from '@shared/composables/useNotification'

function md5Hash(message: string): string {
  function md5cycle(x: number[], k: number[]) {
    let a = x[0], b = x[1], c = x[2], d = x[3]

    a = ff(a, b, c, d, k[0], 7, -680876936)
    d = ff(d, a, b, c, k[1], 12, -389564586)
    c = ff(c, d, a, b, k[2], 17, 606105819)
    b = ff(b, c, d, a, k[3], 22, -1044525330)
    a = ff(a, b, c, d, k[4], 7, -176418897)
    d = ff(d, a, b, c, k[5], 12, 1200080426)
    c = ff(c, d, a, b, k[6], 17, -1473231341)
    b = ff(b, c, d, a, k[7], 22, -45705983)
    a = ff(a, b, c, d, k[8], 7, 1770035416)
    d = ff(d, a, b, c, k[9], 12, -1958414417)
    c = ff(c, d, a, b, k[10], 17, -42063)
    b = ff(b, c, d, a, k[11], 22, -1990404162)
    a = ff(a, b, c, d, k[12], 7, 1804603682)
    d = ff(d, a, b, c, k[13], 12, -40341101)
    c = ff(c, d, a, b, k[14], 17, -1502002290)
    b = ff(b, c, d, a, k[15], 22, 1236535329)

    a = gg(a, b, c, d, k[1], 5, -165796510)
    d = gg(d, a, b, c, k[6], 9, -1069501632)
    c = gg(c, d, a, b, k[11], 14, 643717713)
    b = gg(b, c, d, a, k[0], 20, -373897302)
    a = gg(a, b, c, d, k[5], 5, -701558691)
    d = gg(d, a, b, c, k[10], 9, 38016083)
    c = gg(c, d, a, b, k[15], 14, -660478335)
    b = gg(b, c, d, a, k[4], 20, -405537848)
    a = gg(a, b, c, d, k[9], 5, 568446438)
    d = gg(d, a, b, c, k[14], 9, -1019803690)
    c = gg(c, d, a, b, k[3], 14, -187363961)
    b = gg(b, c, d, a, k[8], 20, 1163531501)
    a = gg(a, b, c, d, k[13], 5, -1444681467)
    d = gg(d, a, b, c, k[2], 9, -51403784)
    c = gg(c, d, a, b, k[7], 14, 1735328473)
    b = gg(b, c, d, a, k[12], 20, -1926607734)

    a = hh(a, b, c, d, k[5], 4, -378558)
    d = hh(d, a, b, c, k[8], 11, -2022574463)
    c = hh(c, d, a, b, k[11], 16, 1839030562)
    b = hh(b, c, d, a, k[14], 23, -35309556)
    a = hh(a, b, c, d, k[1], 4, -1530992060)
    d = hh(d, a, b, c, k[4], 11, 1272893353)
    c = hh(c, d, a, b, k[7], 16, -155497632)
    b = hh(b, c, d, a, k[10], 23, -1094730640)
    a = hh(a, b, c, d, k[13], 4, 681279174)
    d = hh(d, a, b, c, k[0], 11, -358537222)
    c = hh(c, d, a, b, k[3], 16, -722521979)
    b = hh(b, c, d, a, k[6], 23, 76029189)
    a = hh(a, b, c, d, k[9], 4, -640364487)
    d = hh(d, a, b, c, k[12], 11, -421815835)
    c = hh(c, d, a, b, k[15], 16, 530742520)
    b = hh(b, c, d, a, k[2], 23, -995338651)

    a = ii(a, b, c, d, k[0], 6, -198630844)
    d = ii(d, a, b, c, k[7], 10, 1126891415)
    c = ii(c, d, a, b, k[14], 15, -1416354905)
    b = ii(b, c, d, a, k[5], 21, -57434055)
    a = ii(a, b, c, d, k[12], 6, 1700485571)
    d = ii(d, a, b, c, k[3], 10, -1894986606)
    c = ii(c, d, a, b, k[10], 15, -1051523)
    b = ii(b, c, d, a, k[1], 21, -2054922799)
    a = ii(a, b, c, d, k[8], 6, 1873313359)
    d = ii(d, a, b, c, k[15], 10, -30611744)
    c = ii(c, d, a, b, k[6], 15, -1560198380)
    b = ii(b, c, d, a, k[13], 21, 1309151649)
    a = ii(a, b, c, d, k[4], 6, -145523070)
    d = ii(d, a, b, c, k[11], 10, -1120210379)
    c = ii(c, d, a, b, k[2], 15, 718787259)
    b = ii(b, c, d, a, k[9], 21, -343485551)

    x[0] = add32(a, x[0])
    x[1] = add32(b, x[1])
    x[2] = add32(c, x[2])
    x[3] = add32(d, x[3])
  }

  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    a = add32(add32(a, q), add32(x, t))
    return add32((a << s) | (a >>> (32 - s)), b)
  }

  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & c) | (~b & d), a, b, x, s, t)
  }

  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t)
  }

  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(b ^ c ^ d, a, b, x, s, t)
  }

  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return cmn(c ^ (b | ~d), a, b, x, s, t)
  }

  function md51(s: string) {
    const n = s.length
    const state = [1732584193, -271733879, -1732584194, 271733878]
    let i: number
    for (i = 64; i <= n; i += 64) {
      md5cycle(state, md5blk(s.substring(i - 64, i)))
    }
    s = s.substring(i - 64)
    const tail = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    for (i = 0; i < s.length; i++) {
      tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3)
    }
    tail[i >> 2] |= 0x80 << ((i % 4) << 3)
    if (i > 55) {
      md5cycle(state, tail)
      for (i = 0; i < 16; i++) tail[i] = 0
    }
    tail[14] = n * 8
    md5cycle(state, tail)
    return state
  }

  function md5blk(s: string) {
    const md5blks = []
    for (let i = 0; i < 64; i += 4) {
      md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24)
    }
    return md5blks
  }

  const hex_chr = '0123456789abcdef'.split('')

  function rhex(n: number) {
    let s = ''
    for (let j = 0; j < 4; j++) {
      s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F]
    }
    return s
  }

  function hex(x: number[]) {
    return x.map(rhex).join('')
  }

  function add32(a: number, b: number) {
    return (a + b) & 0xFFFFFFFF
  }

  return hex(md51(message))
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

function pkcs7Pad(data: Uint8Array, blockSize: number): Uint8Array {
  const padLen = blockSize - (data.length % blockSize)
  const padded = new Uint8Array(data.length + padLen)
  padded.set(data)
  for (let i = data.length; i < padded.length; i++) {
    padded[i] = padLen
  }
  return padded
}

function pkcs7Unpad(data: Uint8Array): Uint8Array {
  const padLen = data[data.length - 1]
  if (padLen < 1 || padLen > 16) return data
  return data.slice(0, data.length - padLen)
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    utf8ToBytes(password).buffer as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function aesEncrypt(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(password, salt)
  const data = pkcs7Pad(utf8ToBytes(plaintext), 16)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv.buffer as ArrayBuffer }, key, data.buffer as ArrayBuffer)
  const result = new Uint8Array(salt.length + iv.length + new Uint8Array(encrypted).length)
  result.set(salt, 0)
  result.set(iv, salt.length)
  result.set(new Uint8Array(encrypted), salt.length + iv.length)
  return toHex(result.buffer)
}

async function aesDecrypt(cipherHex: string, password: string): Promise<string> {
  const data = fromHex(cipherHex)
  if (data.length < 33) throw new Error('Invalid ciphertext: too short')
  const salt = data.slice(0, 16)
  const iv = data.slice(16, 32)
  const encrypted = data.slice(32)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv.buffer as ArrayBuffer }, key, encrypted.buffer as ArrayBuffer)
  return bytesToUtf8(pkcs7Unpad(new Uint8Array(decrypted)))
}

export function useEncrypt() {
  const notification = useNotification()

  function generateUuid(): string {
    return crypto.randomUUID()
  }

  function computeMd5(text: string): string {
    if (!text) {
      notification.error('Input is empty')
      return ''
    }
    return md5Hash(text)
  }

  async function encryptAes(text: string, password: string): Promise<string> {
    if (!text) {
      notification.error('Input is empty')
      return ''
    }
    if (!password) {
      notification.error('AES password is required')
      return ''
    }
    try {
      return await aesEncrypt(text, password)
    } catch (e) {
      notification.error(`AES encrypt failed: ${e instanceof Error ? e.message : String(e)}`)
      return ''
    }
  }

  async function decryptAes(cipherHex: string, password: string): Promise<string> {
    if (!cipherHex) {
      notification.error('Ciphertext is empty')
      return ''
    }
    if (!password) {
      notification.error('AES password is required')
      return ''
    }
    try {
      return await aesDecrypt(cipherHex, password)
    } catch (e) {
      notification.error(`AES decrypt failed: ${e instanceof Error ? e.message : String(e)}`)
      return ''
    }
  }

  return {
    generateUuid,
    computeMd5,
    encryptAes,
    decryptAes,
  }
}
