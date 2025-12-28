import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Code } from 'mdast'

export function extractCodeBlock(markdown: string, language?: string): string {
  try {
    const tree = unified().use(remarkParse).parse(markdown)

    for (const node of tree.children) {
      if (node.type === 'code') {
        const codeNode = node as Code
        if (!language || codeNode.lang === language || !codeNode.lang) {
          return codeNode.value
        }
      }
    }

    return markdown.trim()
  } catch (error) {
    console.error('Failed to parse markdown:', error)
    return markdown.trim()
  }
}

export function extractAllCodeBlocks(
  markdown: string
): Array<{ language: string | null; value: string }> {
  try {
    const tree = unified().use(remarkParse).parse(markdown)
    const codeBlocks: Array<{ language: string | null; value: string }> = []

    for (const node of tree.children) {
      if (node.type === 'code') {
        const codeNode = node as Code
        codeBlocks.push({
          language: codeNode.lang || null,
          value: codeNode.value
        })
      }
    }

    return codeBlocks
  } catch (error) {
    console.error('Failed to parse markdown:', error)
    return []
  }
}
