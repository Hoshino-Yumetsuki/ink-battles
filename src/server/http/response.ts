export function setResponseHeaders(
  response: Response,
  setHeader: (name: string, value: string | string[]) => void
): void {
  const setCookies = response.headers.getSetCookie()

  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") {
      setHeader(name, value)
    }
  })

  if (setCookies.length > 0) {
    setHeader("set-cookie", setCookies)
  }
}
