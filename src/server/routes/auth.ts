import { Elysia } from 'elysia'
import { forwardJsonHandler } from '@/server/http/forward-handler'
import { POST as avatarPost } from '@/server/routes/handlers/auth/avatar/avatar'
import { POST as loginPost } from '@/server/routes/handlers/auth/login/login'
import { POST as logoutPost } from '@/server/routes/handlers/auth/logout/logout'
import { GET as meGet } from '@/server/routes/handlers/auth/me/me'
import { POST as refreshPost } from '@/server/routes/handlers/auth/refresh/refresh'
import { POST as registerPost } from '@/server/routes/handlers/auth/register/register'
import { POST as sendCodePost } from '@/server/routes/handlers/auth/send-code/send-code'
import { POST as verifyEmailPost } from '@/server/routes/handlers/auth/verify-email/verify-email'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/avatar', forwardJsonHandler(avatarPost))
  .post('/login', forwardJsonHandler(loginPost))
  .post('/logout', forwardJsonHandler(logoutPost))
  .get('/me', ({ request }) => meGet(request))
  .post('/refresh', forwardJsonHandler(refreshPost))
  .post('/register', forwardJsonHandler(registerPost))
  .post('/send-code', forwardJsonHandler(sendCodePost))
  .post('/verify-email', forwardJsonHandler(verifyEmailPost))
