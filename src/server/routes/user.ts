import { Elysia } from 'elysia'
import { forwardJsonHandler } from '@/server/http/forward-handler'
import { POST as changeEmailPost } from '@/server/routes/handlers/user/change-email/change-email'
import { POST as changePasswordPost } from '@/server/routes/handlers/user/change-password/change-password'
import {
  DELETE as customApiDelete,
  GET as customApiGet,
  POST as customApiPost
} from '@/server/routes/handlers/user/custom-api/custom-api'
import { POST as deletePost } from '@/server/routes/handlers/user/delete/delete'

export const userRoutes = new Elysia({ prefix: '/user' })
  .post('/change-email', forwardJsonHandler(changeEmailPost))
  .post('/change-password', forwardJsonHandler(changePasswordPost))
  .get('/custom-api', ({ request }) => customApiGet(request))
  .post('/custom-api', forwardJsonHandler(customApiPost))
  .delete('/custom-api', ({ request }) => customApiDelete(request))
  .post('/delete', forwardJsonHandler(deletePost))
