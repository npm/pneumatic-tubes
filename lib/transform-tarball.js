const fs = require('fs')
const path = require('path')
const gunzip = require('gunzip-maybe')
const removeFile = require('./remove-file')
const { ReadableStreamBuffer, WritableStreamBuffer } = require('stream-buffers')
const tar = require('tar-stream')
const uuid = require('uuid/v4')
const zlib = require('zlib')

module.exports = transformTarball

async function transformTarball (tarball, {
  targetRegistry,
  tmpFolder,
  removePublishRegistry = false,
  keepArtifacts = false,
  traceLog = false
} = {}) {
  return new Promise((resolve, reject) => {
    let correctedPublishRegistry = false
    const gzip = () => zlib.createGzip()
    const newTarball = path.resolve(tmpFolder, `${uuid()}.tgz`)
    const srcStream = fs.createReadStream(tarball)
    const dstStream = fs.createWriteStream(newTarball)
    const gunzipStream = gunzip()
    const gzipStream = gzip()

    // Check whether the property is defined in the tarball
    const done = async error => {
      if (error) {
        console.error('Error in stream:', error)
        reject(error)
      } else {
        pack.finalize()
        if (!keepArtifacts) {
          await removeFile(correctedPublishRegistry ? tarball : newTarball)
        }
        console.info(`transformed to ${newTarball}`)
        resolve(correctedPublishRegistry ? newTarball : tarball)
      }
    }

    const extract = tar.extract()
    const pack = tar.pack()

    extract.on('entry', (header, stream, callback) => {
      if (header.size === 0) {
        stream.on('end', () => pack.entry(header, callback).end())
        stream.resume()
      } else if (header.name === 'package/package.json') {
        if (traceLog) {
          console.info(`Inspecting ${header.name}`)
        }
        const inBuffer = new WritableStreamBuffer()
        const outBuffer = new ReadableStreamBuffer()

        stream
          .pipe(inBuffer)
          .once('error', error => reject(error))
          .once('finish', () => {
            const pkg = JSON.parse(inBuffer.getContentsAsString('utf8'))
            if ((pkg.publishConfig || {}).registry == null) {
              outBuffer.put(inBuffer.getContents())
            } else {
              correctedPublishRegistry = true
              if (removePublishRegistry) {
                console.info(`erasing custom registry ${pkg.publishConfig.registry}`)
                delete pkg.publishConfig.registry
                if (Object.keys(pkg.publishConfig).length < 1) {
                  delete pkg.publishConfig
                }
              } else {
                console.info(`rewriting custom registry: ${pkg.publishConfig.registry} -> ${targetRegistry}`)
                pkg.publishConfig.registry = targetRegistry
              }
              outBuffer.put(Buffer.from(JSON.stringify(pkg, null, 2) + '\n'))
            }
            outBuffer.stop()
            header.size = outBuffer.size()
            outBuffer.pipe(pack.entry(header, callback))
          })
      } else {
        // Forward the entry into the new tarball unmodified.
        if (traceLog) {
          console.info(`Forwarding ${header.name}`)
        }
        stream.pipe(pack.entry(header, callback))
      }
    })

    extract.once('finish', () => done())

    const streams = [srcStream, dstStream, gunzipStream, gzipStream, extract]
    streams.forEach(stream => stream.once('error', error => done(error)))

    srcStream.pipe(gunzipStream).pipe(extract)
    pack.pipe(gzipStream).pipe(dstStream)
  })
}
