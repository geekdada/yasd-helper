import fs from 'fs-extra'
import ini from 'ini'
import _ from 'lodash'

export function loadSurgeConfig(
  path: string,
): {
  pfx?: string
  passphrase?: string
} {
  if (!fs.existsSync(path)) {
    throw new Error(`配置文件 ${path} 不存在`)
  }

  const surgeConfig = ini.decode(
    fs.readFileSync(path, {
      encoding: 'utf8',
    }),
  )

  return {
    pfx: _.get(surgeConfig, "MITM['ca-p12']"),
    passphrase: _.get(surgeConfig, "MITM['ca-passphrase']"),
  }
}
