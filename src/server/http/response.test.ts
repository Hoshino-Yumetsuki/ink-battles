import { describe, expect, it } from "vitest"
import { setResponseHeaders } from "./response"

describe("setResponseHeaders", () => {
  it("preserves each Set-Cookie header as a separate value", () => {
    const headers = new Headers({ "content-type": "application/json" })
    headers.append("set-cookie", "auth_token=access; Path=/; HttpOnly")
    headers.append("set-cookie", "refresh_token=refresh; Path=/; HttpOnly")
    const received: Record<string, string | string[] | undefined> = {}

    setResponseHeaders(new Response(null, { headers }), (name, value) => {
      received[name] = value
    })

    expect(received["set-cookie"]).toEqual([
      "auth_token=access; Path=/; HttpOnly",
      "refresh_token=refresh; Path=/; HttpOnly"
    ])
    expect(received["content-type"]).toBe("application/json")
  })
})
