type CookieValue = { value: string }

export type NextRequest = Request & {
  cookies: {
    get(name: string): CookieValue | undefined
  }
}

export const NextResponse = {
  json: Response.json
}
