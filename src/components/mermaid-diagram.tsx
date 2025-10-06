'use client'

import { useEffect, useRef, useState } from 'react'
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

          const errorDivs = document.querySelectorAll('div[id^="dmermaid"]')
          errorDivs.forEach((div) => {
            const errorSvg = div.querySelector(
              'svg[aria-roledescription="error"]'
            )
            if (errorSvg) {
              div.remove()
            }
          })
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
              <summary className="cursor-pointer text-xs">查看原始代码</summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                {chart}
              </pre>
            </details>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="mermaid-container flex justify-center items-center min-h-[200px]"
          />
        )}
      </CardContent>
    </Card>
  )
}
