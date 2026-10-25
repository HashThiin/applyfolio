/**
 * 把岗位数据压成 `#import=<base64url(gzip(json))>` 里的 token。
 *
 * ⚠️ 格式必须与 `src/lib/jobImport.ts` 的 decodeImportToken 完全一致；
 * 改这里就要同步改那边，并对跑 `npm test` 的 jobImport 用例。
 */
;(function () {
  function toBase64Url(bytes) {
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000))
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  async function gzip(text) {
    const stream = new Blob([new TextEncoder().encode(text)])
      .stream()
      .pipeThrough(new CompressionStream('gzip'))
    return new Uint8Array(await new Response(stream).arrayBuffer())
  }

  /**
   * JD 太长会让地址变得夸张，逐级砍到 1500 字再试。
   * 返回值总是一个 token，最坏情况也只是 JD 变短。
   */
  async function encodeJob(job) {
    const limits = [job.jdText.length, 4000, 2000, 1500]
    let token = ''
    for (const limit of limits) {
      token = toBase64Url(await gzip(JSON.stringify({ ...job, jdText: job.jdText.slice(0, limit) })))
      if (token.length <= 12000) return token
    }
    return token
  }

  globalThis.AF_ENCODE = { encodeJob }
})()
