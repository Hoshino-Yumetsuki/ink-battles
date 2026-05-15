import { describe, expect, it } from 'vitest'
import { readCookie, serializeCookie } from './cookies'

describe('cookie helpers', () => {
  it('reads a named cookie from a standard Request', () => {
    const request = new Request('https://example.test', {
      headers: {
        cookie: 'theme=dark; auth_token=abc123; enc_key=secret'
      }
    })

    expect(readCookie(request, 'auth_token')).toBe('abc123')
  })

  it('serializes cookie attributes for Worker responses', () => {
    expect(
      serializeCookie('auth_token', 'abc123', [
        'HttpOnly',
        'Path=/',
        'SameSite=Lax',
        'Max-Age=900'
      ])
    ).toBe('auth_token=abc123; HttpOnly; Path=/; SameSite=Lax; Max-Age=900')
  })
})
