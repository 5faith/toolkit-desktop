export function useEncodingTool() {

  function formatHtml(html: string): string {
    if (!html.trim()) return ''
    let result = ''
    let indent = 0
    const tab = '  '

    const selfClosing = new Set([
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
      'link', 'meta', 'param', 'source', 'track', 'wbr',
    ])

    const rawTextTags = new Set(['script', 'style', 'pre', 'code', 'textarea'])

    const cleaned = html
      .replace(/<!--[\s\S]*?-->/g, match => `\n${match}\n`)
      .replace(/>\s+</g, '><')

    let i = 0
    const len = cleaned.length

    while (i < len) {
      if (cleaned[i] === '<') {
        const isComment = cleaned.startsWith('<!--', i)
        if (isComment) {
          const end = cleaned.indexOf('-->', i)
          if (end === -1) {
            result += tab.repeat(indent) + cleaned.slice(i) + '\n'
            break
          }
          const comment = cleaned.slice(i, end + 3)
          if (comment.includes('\n')) {
            const lines = comment.split('\n').filter(l => l.trim())
            for (const line of lines) {
              result += tab.repeat(indent) + line.trim() + '\n'
            }
          } else {
            result += tab.repeat(indent) + comment + '\n'
          }
          i = end + 3
          continue
        }

        const tagMatch = cleaned.slice(i).match(/^<(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)\b/)
        if (!tagMatch) {
          result += tab.repeat(indent) + cleaned[i]
          i++
          continue
        }

        const isClosing = tagMatch[1] === '/'
        const tagName = tagMatch[2].toLowerCase()
        const isSelfClosing = selfClosing.has(tagName)

        if (isClosing) {
          indent = Math.max(0, indent - 1)
        }

        const closeIndex = findTagClose(cleaned, i)
        const tagStr = cleaned.slice(i, closeIndex + 1)
        i = closeIndex + 1

        if (rawTextTags.has(tagName) && !isClosing) {
          const endTag = `</${tagName}`
          const rawEnd = cleaned.toLowerCase().indexOf(endTag, i)
          if (rawEnd !== -1) {
            const rawEndClose = cleaned.indexOf('>', rawEnd)
            if (rawEndClose !== -1) {
              result += tab.repeat(indent) + tagStr.trim() + '\n'
              const rawContent = cleaned.slice(i, rawEnd).trim()
              if (rawContent) {
                result += tab.repeat(indent + 1) + rawContent + '\n'
              }
              result += tab.repeat(indent) + cleaned.slice(rawEnd, rawEndClose + 1) + '\n'
              i = rawEndClose + 1
              continue
            }
          }
        }

        if (!isClosing && !isSelfClosing && !tagStr.endsWith('/>')) {
          indent++
        }

        result += tab.repeat(indent) + tagStr.trim() + '\n'
      } else {
        let nextTag = cleaned.indexOf('<', i)
        if (nextTag === -1) nextTag = len
        const text = cleaned.slice(i, nextTag).trim()
        if (text) {
          result += tab.repeat(indent) + text + '\n'
        }
        i = nextTag
      }
    }

    return result.trimEnd()
  }

  function findTagClose(s: string, start: number): number {
    let inQuote = false
    let quoteChar = ''
    for (let i = start; i < s.length; i++) {
      const c = s[i]
      if (inQuote) {
        if (c === quoteChar) inQuote = false
      } else {
        if (c === '"' || c === "'") {
          inQuote = true
          quoteChar = c
        } else if (c === '>') {
          return i
        }
      }
    }
    return s.length - 1
  }

  function encodeHtmlEntities(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
      '&nbsp;': ' ',
    }
    let result = text
    for (const [entity, char] of Object.entries(entities)) {
      result = result.split(entity).join(char)
    }
    result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    return result
  }

  function encodeUrl(text: string): string {
    return encodeURIComponent(text)
  }

  function decodeUrl(text: string): string {
    return decodeURIComponent(text)
  }

  function encodeBase64(text: string): string {
    const bytes = new TextEncoder().encode(text)
    const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
    return btoa(binary)
  }

  function decodeBase64(text: string): string {
    const binary = atob(text)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    return new TextDecoder('utf-8').decode(bytes)
  }

  return {
    formatHtml,
    encodeHtmlEntities,
    decodeHtmlEntities,
    encodeUrl,
    decodeUrl,
    encodeBase64,
    decodeBase64,
  }
}
