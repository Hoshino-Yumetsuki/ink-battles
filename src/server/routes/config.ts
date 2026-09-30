import { Elysia } from "elysia"
import { isCaptchaEnabled } from "@/utils/captcha"

export const configRoutes = new Elysia().get("/config", () => ({
  captchaEnabled: isCaptchaEnabled()
}))
