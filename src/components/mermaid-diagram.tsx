'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import mermaid from 'mermaid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface MermaidDiagramProps {
  chart: string
  title?: string
}

export default function MermaidDiagram({
  chart,
  title = 'Mermaid 图表'
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [_isRendered, setIsRendered] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!chart || !containerRef.current) return

    const renderDiagram = async () => {
      try {
        setError(null)
        setIsRendered(false)

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'inherit'
        })

        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }

        const id = `mermaid-${Math.random().toString(36).slice(2, 11)}`

        const { svg } = await mermaid.render(id, chart.trim())

        if (containerRef.current) {
          containerRef.current.innerHTML = svg
          setIsRendered(true)
        }
      } catch (err: any) {
        console.error('Mermaid 渲染错误:', err)
        setError(err.message || '渲染失败')
      }
    }

    renderDiagram()
  }, [chart])

  if (!chart) return null

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-red-500 text-sm">
              <p className="font-semibold">渲染失败:</p>
              <p>{error}</p>
              <details className="mt-2">
                <summary className="cursor-pointer text-xs">
                  查看原始代码
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                  {chart}
                </pre>
              </details>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="mermaid-container flex justify-center items-center min-h-[200px] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setIsZoomed(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsZoomed(true)
                }
              }}
              role="button"
              tabIndex={0}
              title="点击放大查看"
            />
          )}
        </CardContent>
      </Card>

      {mounted &&
        isZoomed &&
        createPortal(
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setIsZoomed(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsZoomed(false)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="关闭预览"
          >
            <div
              className="relative w-[90vw] h-[90vh] bg-white dark:bg-gray-900 rounded-lg p-8 flex flex-col"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full text-2xl font-bold z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsZoomed(false)
                }}
                aria-label="关闭"
              >
                ×
              </button>
              <div
                className="mermaid-container flex justify-start items-start flex-1 overflow-auto"
                ref={(node) => {
                  if (node && containerRef.current) {
                    node.innerHTML = containerRef.current.innerHTML
                    const svg = node.querySelector('svg')
                    if (svg) {
                      svg.style.minWidth = '100%'
                      svg.style.minHeight = '100%'
                      svg.style.width = 'auto'
                      svg.style.height = 'auto'
                    }
                  }
                }}
              />
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
