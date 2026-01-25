import { type NextRequest, NextResponse } from 'next/server'
import { getDatabase, closeDatabaseConnection } from '@/utils/mongodb'
import { verifyToken, extractToken } from '@/utils/jwt'
import type { MongoClient } from 'mongodb'

export async function POST(req: NextRequest) {
  let dbClient: MongoClient | null = null
  try {
    const token =
      extractToken(req.headers.get('authorization')) ||
      req.cookies.get('auth_token')?.value ||
      null

    if (!token) {
      return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    const body = await req.json()

    const { encryptedResult, mode, score } = body

    if (!encryptedResult || !mode) {
      return NextResponse.json({ error: '缺少必要的数据字段' }, { status: 400 })
    }

    const { db, client } = await getDatabase()
    dbClient = client
    const historyCollection = db.collection('analysis_history')

    await historyCollection.insertOne({
      userId: payload.userId,
      // encryptedContent, // 不再保存文章内容
      encryptedResult,
      mode,
      score: typeof score === 'number' ? score : 0,
      createdAt: new Date()
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Save history error:', error)
    return NextResponse.json({ error: '保存记录失败' }, { status: 500 })
  } finally {
    if (dbClient) {
      await closeDatabaseConnection(dbClient)
    }
  }
}
