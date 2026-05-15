import { useEffect, useState } from 'react'

function currentPathname() {
  return window.location.pathname
}

export function navigate(path: string, replace = false) {
  if (replace) {
    window.history.replaceState(null, '', path)
  } else {
    window.history.pushState(null, '', path)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function usePathname() {
  const [pathname, setPathname] = useState(currentPathname)

  useEffect(() => {
    const update = () => setPathname(currentPathname())
    window.addEventListener('popstate', update)
    return () => window.removeEventListener('popstate', update)
  }, [])

  return pathname
}

export function useRouter() {
  return {
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, true)
  }
}
