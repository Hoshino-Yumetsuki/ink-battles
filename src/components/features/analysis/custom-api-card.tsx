'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyRound, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { buildApiUrl } from '@/utils/api-url'
import { authFetch } from '@/utils/auth-client'
import { motion, AnimatePresence } from 'framer-motion'

export interface CustomApiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

interface CustomApiCardProps {
  isLoggedIn: boolean
  onChange: (config: CustomApiConfig | null) => void
  disabled?: boolean
}

export default function CustomApiCard({
  isLoggedIn,
  onChange,
  disabled = false
}: CustomApiCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const [savedModel, setSavedModel] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  // 已登录时，加载已保存的凭据状态
  const loadSavedConfig = useCallback(async () => {
    if (!isLoggedIn) return
    try {
      const res = await authFetch(buildApiUrl('/api/user/custom-api'), { method: 'GET' })
      if (res.ok) {
        const data = (await res.json()) as { hasConfig: boolean; model?: string }
        setHasSaved(data.hasConfig)
        setSavedModel(data.model || '')
        if (data.hasConfig) {
          // 通知父组件已有保存的配置（服务端会自动读取，传 null 表示用服务端存储的）
          onChange(null)
        }
      }
    } catch {
      // 静默失败
    }
  }, [isLoggedIn, onChange])

  useEffect(() => {
    loadSavedConfig()
  }, [loadSavedConfig])

  const handleSave = async () => {
    setError('')
    if (!baseUrl || !apiKey || !model) {
      setError('所有字段均为必填项')
      return
    }
    try {
      new URL(baseUrl)
    } catch {
      setError('请输入有效的 Base URL')
      return
    }

    if (isLoggedIn) {
      setSaving(true)
      try {
        const res = await authFetch(buildApiUrl('/api/user/custom-api'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseUrl, apiKey, model })
        })
        const data = (await res.json()) as { error?: string }
        if (!res.ok) throw new Error(data.error || '保存失败')
        setHasSaved(true)
        setSavedModel(model)
        setBaseUrl('')
        setApiKey('')
        setModel('')
        setExpanded(false)
        onChange(null) // 服务端会自动读取
      } catch (err: any) {
        setError(err.message)
      } finally {
        setSaving(false)
      }
    } else {
      // 未登录：仅传给父组件本次使用
      onChange({ baseUrl, apiKey, model })
      setExpanded(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await authFetch(buildApiUrl('/api/user/custom-api'), { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || '删除失败')
      }
      setHasSaved(false)
      setSavedModel('')
      onChange(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = () => {
    setExpanded(true)
    setBaseUrl('')
    setApiKey('')
    setModel(savedModel)
  }

  return (
    <Card className="w-full">
      <CardHeader
        className="cursor-pointer select-none pb-3"
        onClick={() => {
          if (hasSaved) {
            handleEdit()
          } else {
            setExpanded((v) => !v)
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">自定义 API</CardTitle>
            {hasSaved && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                已配置
              </span>
            )}
          </div>
          {!hasSaved && (
            expanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <CardDescription className="text-xs">
          使用自己的 API Key 进行分析，跳过使用次数限制
        </CardDescription>
      </CardHeader>

      <AnimatePresence initial={false}>
        {/* 已保存状态：显示占位符 + 删除按钮 */}
        {hasSaved && !expanded && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Base URL', value: '••••••••••••••••' },
                  { label: 'API Key', value: '••••••••••••••••' },
                  { label: 'Model', value: savedModel || llmConfigPlaceholder }
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground w-20 shrink-0">{label}</span>
                    <span className="font-mono text-xs text-muted-foreground truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleEdit}
                  disabled={disabled}
                >
                  修改凭据
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={handleDelete}
                  disabled={disabled || deleting}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </CardContent>
          </motion.div>
        )}

        {/* 展开的输入表单 */}
        {(expanded || (!hasSaved && expanded)) && (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="pt-0 space-y-3">
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Base URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    disabled={disabled || saving}
                    className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    disabled={disabled || saving}
                    className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="gemini-3.1-pro-preview"
                    disabled={disabled || saving}
                    className="w-full text-sm px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                </div>
              </div>

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={handleSave}
                  disabled={disabled || saving}
                >
                  {saving ? '保存中...' : isLoggedIn ? '保存凭据' : '本次使用'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setExpanded(false)
                    setError('')
                  }}
                  disabled={saving}
                >
                  取消
                </Button>
              </div>

              {isLoggedIn ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  凭据经过加密后安全存储，即使是服务端也无法读取明文
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  登录后可保存凭据供下次使用
                </p>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// 占位符文本（服务端默认模型名不暴露给前端）
const llmConfigPlaceholder = '服务端默认'
