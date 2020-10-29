import Hapi, { ResponseObject } from '@hapi/hapi'
import http2 from 'http2'
import https from 'https'
import http from 'http'
import axios from 'axios'
import _ from 'lodash'
import H2o2 from '@hapi/H2o2'
import Boom from '@hapi/boom'
import HapiPino from 'hapi-pino'

const httpAgent = new http.Agent({ keepAlive: true })

export async function createServer(
  cert: {
    cert: string
    key: string
  },
  host: string,
  port: number,
): Promise<Hapi.Server> {
  const server = Hapi.server({
    port,
    host,
    address: '0.0.0.0',
    tls: true,
    compression: {
      minBytes: 2048,
    },
    listener: http2.createSecureServer({
      cert: cert.cert,
      key: cert.key,
      allowHTTP1: true,
    }) as https.Server,
  })
  await server.register(H2o2)
  await server.register({
    plugin: HapiPino,
    options: {
      prettyPrint: process.env.NODE_ENV !== 'production',
      // Redact Authorization headers, see https://getpino.io/#/docs/redaction
      redact: ['req.headers.authorization'],
      logRequestComplete: false,
    },
  })

  // Hooks
  server.ext('onPreResponse', function (request, h) {
    if (!request.response.hasOwnProperty('isBoom')) {
      const response = request.response as ResponseObject

      response.header(
        'x-powered-by',
        `yasd-helper/${require('../package.json').version}`,
      )
    }

    return h.continue
  })

  // Routes
  server.route({
    method: '*',
    path: '/{p*}',
    options: {
      cors: {
        origin: ['*'],
        additionalHeaders: ['x-key', 'x-surge-host', 'x-surge-port'],
      },
    },
    handler: async function (request, h) {
      const surgeHost = request.headers['x-surge-host']
      const surgePort = request.headers['x-surge-port']

      if (!surgeHost || !surgePort) {
        return h.response().code(400)
      }

      const url = request.url
      url.hostname = surgeHost
      url.port = surgePort
      url.protocol = 'http:'

      const headers = _.pick(
        request.headers,
        'x-key',
        'user-agent',
        'host',
        'connection',
      )

      try {
        const upstreamRes = await axios.request({
          url: url.toString(),
          method: request.method,
          data: request.payload,
          headers,
          httpAgent,
        })

        if (!upstreamRes.headers.hasOwnProperty('x-surge-version')) {
          return h.response().code(400)
        }

        const response = h.response(upstreamRes.data).code(upstreamRes.status)

        Object.keys(upstreamRes.headers).forEach((key) => {
          if (['x-system', 'x-surge-build', 'x-surge-version'].includes(key)) {
            response.header(key, upstreamRes.headers[key], {
              override: true,
            })
          }
        })

        return response
      } catch (err) {
        const upstreamStatusCode = _.get(err, 'response.status')

        Boom.boomify(err, {
          statusCode: upstreamStatusCode ?? 500,
        })

        throw err
      }
    },
  })

  return server
}
