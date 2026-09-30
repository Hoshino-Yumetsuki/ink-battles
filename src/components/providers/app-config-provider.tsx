import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react"
import { buildApiUrl } from "@/utils/api-url"

interface AppConfig {
  captchaEnabled: boolean
}

const AppConfigContext = createContext<AppConfig | null>(null)

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(buildApiUrl("/api/config"), { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load app config: ${response.status}`)
        }

        const data = (await response.json()) as { captchaEnabled?: unknown }
        return { captchaEnabled: data.captchaEnabled === true }
      })
      .then((nextConfig) => {
        if (!cancelled) {
          setConfig(nextConfig)
        }
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          setConfig({ captchaEnabled: false })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!config) {
    return null
  }

  return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>
}

export function useAppConfig() {
  const config = useContext(AppConfigContext)

  if (!config) {
    throw new Error("useAppConfig must be used within AppConfigProvider")
  }

  return config
}
