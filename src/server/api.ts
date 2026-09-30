import { Elysia } from "elysia"
import { analyzeRoutes } from "@/server/routes/analyze"
import { authRoutes } from "@/server/routes/auth"
import { capRoutes } from "@/server/routes/cap"
import { configRoutes } from "@/server/routes/config"
import { dashboardRoutes } from "@/server/routes/dashboard"
import { limitsRoutes } from "@/server/routes/limits"
import { userRoutes } from "@/server/routes/user"

export const api = new Elysia({ prefix: "/api" })
  .use(analyzeRoutes)
  .use(authRoutes)
  .use(capRoutes)
  .use(dashboardRoutes)
  .use(limitsRoutes)
  .use(configRoutes)
  .use(userRoutes)
