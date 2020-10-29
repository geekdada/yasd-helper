// istanbul ignore next
export const toBase64 = (str: string): string =>
  Buffer.from(str, 'utf8').toString('base64')

// istanbul ignore next
export const fromBase64 = (str: string): Buffer => Buffer.from(str, 'base64')
