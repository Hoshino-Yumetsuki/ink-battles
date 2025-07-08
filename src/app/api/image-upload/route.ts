import { type NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

// 确保上传目录存在
import { mkdir } from 'node:fs/promises'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: '未找到上传文件' }, { status: 400 })
    }

    // 验证文件类型
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，仅支持JPG、PNG、WebP和GIF图片' },
        { status: 400 }
      )
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件过大，请上传小于10MB的图片' },
        { status: 400 }
      )
    }

    // 创建uploads目录（如果不存在）
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // 生成唯一文件名
    const fileExt = file.name.split('.').pop() || 'jpg'
    const randomId = crypto.randomBytes(16).toString('hex')
    const fileName = `${randomId}.${fileExt}`
    const filePath = path.join(uploadDir, fileName)

    // 读取文件内容
    const buffer = Buffer.from(await file.arrayBuffer())

    // 写入文件
    await writeFile(filePath, buffer)

    // 返回可访问的URL
    const fileUrl = `/uploads/${fileName}`

    return NextResponse.json({ url: fileUrl }, { status: 200 })
  } catch (error: any) {
    console.error('文件上传错误:', error)
    return NextResponse.json(
      { error: `上传失败: ${error.message || '服务器错误'}` },
      { status: 500 }
    )
  }
}
