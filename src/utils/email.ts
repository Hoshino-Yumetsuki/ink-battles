import nodemailer from 'nodemailer'
import { logger } from './logger'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
})

export type EmailType = 'register' | 'bind_email' | 'change_password'

export async function sendVerificationEmail(
  to: string,
  code: string,
  type: EmailType = 'register'
) {
  let title = '欢迎加入 Ink Battles!'
  let actionText = '您正在注册账号，请使用以下验证码完成验证：'

  switch (type) {
    case 'bind_email':
      title = '绑定邮箱验证'
      actionText = '您正在进行邮箱绑定操作，请使用以下验证码完成验证：'
      break
    case 'change_password':
      title = '修改密码验证'
      actionText = '您正在进行修改密码操作，请使用以下验证码完成验证：'
      break
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Ink Battles" <noreply@inkbattles.com>', // sender address
      to, // list of receivers
      subject: `Ink Battles - ${title}`, // Subject line
      text: `您的验证码是: ${code}。该验证码将在10分钟后过期。`, // plain text body
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${title}</h2>
          <p>${actionText}</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-radius: 5px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
            ${code}
          </div>
          <p>该验证码将在 10 分钟后过期。如果您没有请求此验证码，请忽略此邮件。</p>
        </div>
      ` // html body
    })

    logger.info(`Verification email sent to ${to}: ${info.messageId}`)
    return true
  } catch (error) {
    logger.error('Error sending verification email:', error)
    return false
  }
}
