import Command, { Context } from 'common-bin'

import { createServer } from '../server'
import { loadSurgeConfig } from '../utils/config'
import { issueCertForDomain } from '../utils/tls'

class StartCommand extends Command {
  constructor(rawArgv?: string[]) {
    super(rawArgv)
    this.usage = '使用方法: yasd start'
    this.options = {
      s: {
        alias: 'surge',
        demandOption: true,
        describe: '当前 Surge 配置文件，用于读取证书',
        type: 'string',
      },
      host: {
        describe: '域名',
        type: 'string',
        default: 'localhost',
      },
      p: {
        alias: 'port',
        describe: '端口',
        default: 8443,
      },
    }
  }

  // istanbul ignore next
  public get description(): string {
    return '启动助手'
  }

  async run(ctx: Context): Promise<void> {
    const surgeConfig = loadSurgeConfig(ctx.argv.surge)

    if (!surgeConfig.passphrase || !surgeConfig.pfx) {
      throw new Error('Surge 配置中不包含 MITM 信息，请生成证书后重试')
    }

    const cert = issueCertForDomain(
      surgeConfig.pfx,
      surgeConfig.passphrase,
      ctx.argv.host,
    )

    const server = await createServer(cert, ctx.argv.host, ctx.argv.port)

    await server.start()
  }
}

export = StartCommand
