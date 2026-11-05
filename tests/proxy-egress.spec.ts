/**
 * Egress facts for Kiro's Claude routes.
 *
 * Kiro authorizes Claude models by request egress: a direct connection from an
 * unauthorized network is answered with HTTP 400 `INVALID_MODEL_ID` ("Invalid
 * model. Please select a different model to continue."), not a transport
 * error. Node's `http`/`https` only honor the proxy environment variables when
 * `NODE_USE_ENV_PROXY=1`, so the adapter reads them itself when no explicit
 * `proxyUrl` is configured.
 */

import { describe, expect, it } from 'vitest'
import { resolveAdapterOptions } from '../src/index.ts'
import { proxyFromEnvironment } from '../src/transport.ts'

describe('proxy egress resolution', () => {
  it('reads the standard proxy variables when nothing is configured', () => {
    expect(proxyFromEnvironment({ HTTPS_PROXY: 'http://proxy.example:8080' }))
      .toBe('http://proxy.example:8080')
    expect(proxyFromEnvironment({ https_proxy: 'http://proxy.example:8080' }))
      .toBe('http://proxy.example:8080')
    expect(proxyFromEnvironment({ HTTP_PROXY: 'http://proxy.example:8080' }))
      .toBe('http://proxy.example:8080')
  })

  it('prefers HTTPS_PROXY and ignores blank values', () => {
    expect(proxyFromEnvironment({
      HTTPS_PROXY: 'http://secure.example:8443',
      HTTP_PROXY: 'http://plain.example:8080',
    })).toBe('http://secure.example:8443')
    expect(proxyFromEnvironment({ HTTPS_PROXY: '   ', HTTP_PROXY: 'http://plain.example:8080' }))
      .toBe('http://plain.example:8080')
    expect(proxyFromEnvironment({})).toBeUndefined()
  })

  it('gives a scheme-less environment value the conventional HTTP scheme', () => {
    expect(proxyFromEnvironment({ HTTPS_PROXY: 'proxy.example:8080' }))
      .toBe('http://proxy.example:8080')
  })

  it('lets an explicit proxyUrl win over the environment', () => {
    const resolved = resolveAdapterOptions(
      { proxyUrl: 'http://configured.example:9090' },
      { HTTPS_PROXY: 'http://environment.example:8080' },
    )
    expect(resolved.proxyUrl).toBe('http://configured.example:9090')
  })

  it('fills proxyUrl from the environment when the config omits it', () => {
    const resolved = resolveAdapterOptions({}, { HTTPS_PROXY: 'http://environment.example:8080' })
    expect(resolved.proxyUrl).toBe('http://environment.example:8080')
    // The resolver stays deterministic for callers that pass no environment.
    expect(resolveAdapterOptions({}).proxyUrl).toBeUndefined()
  })

  it('refuses an unusable environment value instead of silently going direct', () => {
    expect(() => resolveAdapterOptions({}, { HTTPS_PROXY: 'socks5://proxy.example:1080' }))
      .toThrow(/environment proxy .* is not a usable HTTP\(S\) proxy/u)
  })
})
