import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react"

function currentPathname() {
  return window.location.pathname
}

export function navigate(path: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, "", path)
  } else {
    window.history.pushState(null, "", path)
  }
  window.dispatchEvent(new PopStateEvent("popstate"))
}

export function usePathname() {
  const [pathname, setPathname] = useState(currentPathname)

  useEffect(() => {
    const update = () => setPathname(currentPathname())
    window.addEventListener("popstate", update)
    return () => window.removeEventListener("popstate", update)
  }, [])

  return pathname
}

export function useRouter() {
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, true)
  }
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  replace?: boolean
}

/** App-internal anchor that performs client-side (soft) navigation. */
export function Link({ href, replace = false, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    // 让浏览器处理新标签页（target=_blank）、修饰键点击与被阻止的默认行为。
    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (href.startsWith("#")) return
    event.preventDefault()
    navigate(href, replace)
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
