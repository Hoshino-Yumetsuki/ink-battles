import { Elysia } from 'elysia'
import { POST as avatarPost } from '@/server/routes/handlers/auth/avatar/avatar'
import { POST as loginPost } from '@/server/routes/handlers/auth/login/login'
import { POST as logoutPost } from '@/server/routes/handlers/auth/logout/logout'
import { GET as meGet } from '@/server/routes/handlers/auth/me/me'
import { POST as refreshPost } from '@/server/routes/handlers/auth/refresh/refresh'
import { POST as registerPost } from '@/server/routes/handlers/auth/register/register'
import { POST as sendCodePost } from '@/server/routes/handlers/auth/send-code/send-code'
import { POST as verifyEmailPost } from '@/server/routes/handlers/auth/verify-email/verify-email'

export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/avatar', ({ request }) => avatarPost(request))
  .post('/login', ({ request }) => loginPost(request))
  .post('/logout', ({ request }) => logoutPost(request))
  .get('/me', ({ request }) => meGet(request))
  .post('/refresh', ({ request }) => refreshPost(request))
  .post('/register', ({ request }) => registerPost(request))
  .post('/send-code', ({ request }) => sendCodePost(request))
  .post('/verify-email', ({ request }) => verifyEmailPost(request))
