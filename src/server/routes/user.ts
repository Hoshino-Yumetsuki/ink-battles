import { Elysia } from 'elysia'
import { POST as changeEmailPost } from '@/server/routes/handlers/user/change-email/change-email'
import { POST as changePasswordPost } from '@/server/routes/handlers/user/change-password/change-password'
import {
  DELETE as customApiDelete,
  GET as customApiGet,
  POST as customApiPost
} from '@/server/routes/handlers/user/custom-api/custom-api'
import { POST as deletePost } from '@/server/routes/handlers/user/delete/delete'

export const userRoutes = new Elysia({ prefix: '/user' })
  .post('/change-email', ({ request }) => changeEmailPost(request))
  .post('/change-password', ({ request }) => changePasswordPost(request))
  .get('/custom-api', ({ request }) => customApiGet(request))
  .post('/custom-api', ({ request }) => customApiPost(request))
  .delete('/custom-api', ({ request }) => customApiDelete(request))
  .post('/delete', ({ request }) => deletePost(request))
