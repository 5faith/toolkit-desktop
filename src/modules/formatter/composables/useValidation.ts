export function useValidation() {
  function validateJsonSyntax(input: string): { valid: boolean; error?: string } {
    try {
      JSON.parse(input)
      return { valid: true }
    } catch (e) {
      return { valid: false, error: String(e) }
    }
  }

  function validateXmlSyntax(input: string): { valid: boolean; error?: string } {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(input, 'application/xml')
      const parseError = doc.querySelector('parsererror')
      if (parseError) {
        return { valid: false, error: parseError.textContent ?? 'Invalid XML' }
      }
      return { valid: true }
    } catch (e) {
      return { valid: false, error: String(e) }
    }
  }

  return { validateJsonSyntax, validateXmlSyntax }
}
