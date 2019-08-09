module.exports = handleAxiosResponse

function handleAxiosResponse (message, { logError = false } = {}) {
  return async response => {
    return new Promise((resolve, reject) => {
      const { status, data } = response
      if (status >= 400) {
        let errorData = data || ''
        try {
          if (typeof errorData === 'string' || errorData instanceof Buffer) {
            errorData = JSON.stringify(JSON.parse(errorData.toString()), null, 2)
          } else {
            errorData = JSON.stringify(errorData, null, 2)
          }
        } catch (e) {
          (() => {})(e)
        }

        if (logError) {
          console.error(`HTTP-Error: [${status}] ${errorData}`)
        }
        reject(new Error(`HTTP-Error: [${status}] ${message}`))
      } else {
        resolve(response)
      }
    })
  }
}
