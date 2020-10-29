import 'source-map-support/register'
import Command from 'common-bin'
import { transports } from '@surgio/logger'
import path from 'path'
import { errorHandler } from './utils/error-helper'

export class YasdCommand extends Command {
  constructor(rawArgv?: string[]) {
    super(rawArgv)

    this.usage = '使用方法: yasd <command> [options]'

    this.load(path.join(__dirname, './command'))

    this.options = {
      V: {
        alias: 'verbose',
        demandOption: false,
        describe: '打印调试日志',
        type: 'boolean',
      },
    }
    // 禁用 yargs 内部生成的 help 信息，似乎和 common-bin 的 load 有冲突
    this.yargs.help(false)

    // istanbul ignore next
    if (this.yargs.argv.verbose) {
      transports.console.level = 'debug'
    }
  }

  // istanbul ignore next
  public errorHandler(err: Error): void {
    errorHandler.call(this, err)
  }
}
