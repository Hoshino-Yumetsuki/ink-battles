import { NextResponse, type NextRequest } from 'next/server'
import { withDatabase } from '@/utils/mongodb'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { verifyToken } from '@/utils/jwt'
import { ObjectId } from 'mongodb'
import { extractAccessTokenFromRequest } from '@/utils/auth-request'
import { getAuthCookieNames } from '@/utils/auth-session'
import { encryptObject, decryptObject } from '@/utils/crypto'

const saveSchema = z.object({
  baseUrl: z.string().url('请输入有效的 URL').trim(),
  apiKey: z.string().min(1, 'API Key 不能为空').trim(),
  model: z.string().min(1, 'Model 不能为空').trim()
})

async function getAuthContext(request: NextRequest) {
  const token = extractAccessTokenFromRequest(request, 'Authorization')
  if (!token) return null
  try {
    const payload = await verifyToken(token)
    const encKey = request.cookies.get(getAuthCookieNames().encKey)?.value ?? null
    return { userId: payload.userId, encKey }
  } catch {
    return null
  }
}

// GET: 获取已保存的凭据（返回脱敏信息，用于判断是否已配置）
export const GET = withDatabase(async (request: NextRequest, db) => {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 })
    if (!auth.encKey) return NextResponse.json({ error: '缺少加密密钥，请重新登录' }, { status: 401 })

    const user = await db.collection('users').findOne({ _id: new ObjectId(auth.userId) })
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 404 })

    if (!user.customApiConfig) {
      return NextResponse.json({ success: true, hasConfig: false })
    }

    try {
      const decrypted = await decryptObject<{ baseUrl: string; apiKey: string; model?: string }>(
        user.customApiConfig,
        auth.encKey
      )
      return NextResponse.json({
        success: true,
        hasConfig: true,
        // 返回脱敏数据供前端显示占位符
        model: decrypted.model || ''
      })
    } catch {
      return NextResponse.json({ success: true, hasConfig: false })
    }
  } catch (error) {
    logger.error('Error getting custom API config:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
})

// POST: 保存/更新凭据
export const POST = withDatabase(async (request: NextRequest, db) => {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 })
    if (!auth.encKey) return NextResponse.json({ error: '缺少加密密钥，请重新登录' }, { status: 401 })

    const body = await request.json()
    const result = saveSchema.safeParse(body)
    if (!result.success)
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })

    const { baseUrl, apiKey, model } = result.data
    const encrypted = await encryptObject({ baseUrl, apiKey, model }, auth.encKey)

    await db.collection('users').updateOne(
      { _id: new ObjectId(auth.userId) },
      { $set: { customApiConfig: encrypted, updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, message: '凭据已保存' })
  } catch (error) {
    logger.error('Error saving custom API config:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
})

// DELETE: 删除凭据
export const DELETE = withDatabase(async (request: NextRequest, db) => {
  try {
    const auth = await getAuthContext(request)
    if (!auth) return NextResponse.json({ error: '未登录' }, { status: 401 })

    await db.collection('users').updateOne(
      { _id: new ObjectId(auth.userId) },
      { $unset: { customApiConfig: '' }, $set: { updatedAt: new Date() } }
    )

    return NextResponse.json({ success: true, message: '凭据已删除' })
  } catch (error) {
    logger.error('Error deleting custom API config:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
})
