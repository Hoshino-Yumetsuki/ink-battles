/**
 * 迁移期临时文件：将旧格式历史记录（明文密码加密）迁移到新格式（enc_key 加密）
 * 迁移完成后（所有用户 historyMigrated=true），可直接删除此文件及 login route 中的调用
 */
import type { Db, ObjectId } from 'mongodb'
import { logger } from '@/utils/logger'
import { decryptObject, encryptObject } from '@/utils/crypto'

export async function migrateHistoryEncryption(
  db: Db,
  userId: string,
  userObjectId: ObjectId,
  plainPassword: string,
  encKey: string
): Promise<void> {
  const historyCollection = db.collection('analysis_history')
  const usersCollection = db.collection('users')

  const histories = await historyCollection
    .find({ userId, encryptedResult: { $exists: true } })
    .toArray()

  const ops = (
    await Promise.allSettled(
      histories.map(async (h) => {
        // 先尝试用新 enc_key 解密，成功说明已迁移过，跳过
        try {
          await decryptObject(h.encryptedResult, encKey)
          return null
        } catch {
          // 解密失败，尝试用旧明文密码解密
        }

        try {
          const decrypted = await decryptObject<unknown>(
            h.encryptedResult,
            plainPassword
          )
          const reEncrypted = await encryptObject(decrypted, encKey)
          return { id: h._id, encryptedResult: reEncrypted }
        } catch {
          return null // 无法解密，跳过
        }
      })
    )
  )
    .filter(
      (
        r
      ): r is PromiseFulfilledResult<{
        id: ObjectId
        encryptedResult: string
      } | null> => r.status === 'fulfilled' && r.value !== null
    )
    .map((r) => r.value as { id: ObjectId; encryptedResult: string })

  if (ops.length > 0) {
    await Promise.all(
      ops.map((op) =>
        historyCollection.updateOne(
          { _id: op.id },
          { $set: { encryptedResult: op.encryptedResult } }
        )
      )
    )
    logger.info(`Migrated ${ops.length} history records for user ${userId}`)
  }

  // 标记迁移完成，下次登录跳过
  await usersCollection.updateOne(
    { _id: userObjectId },
    { $set: { historyMigrated: true } }
  )
}
