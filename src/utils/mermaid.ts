export function sanitizeMermaidCode(input: string): { code: string; changed: boolean } {
  let s = input ?? ''
  const original = s

  // 1) 去除零宽字符与 BOM
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '')

  // 2) 归一化换行
  s = s.replace(/\r\n/g, '\n')

  // 3) 去除/规范化省略号字符（如 \u2026 …、\u22EF ⋯），避免破坏语法（如 B --> … --> C）
  s = s.replace(/[\u2026\u22EF]/g, '')

  // 4) 去除仅包含省略号的独立行
  s = s.replace(/^\s*…\s*$/gm, '')

  // 5) 清理形如 "--> … -->" 的片段
  s = s.replace(/-->\s*…\s*-->/g, '-->')

  // 6) 移除明显不完整的边（以单个连字符结束的行）
  s = s.replace(/^\s*.+-\s*$/gm, '')

  // 7) 统一各种连字符为 ASCII '-'（— – － 等）
  s = s.replace(/[—–－]/g, '-')

  // 8) 统一各种 Unicode 箭头为 Mermaid 可接受的 ASCII 箭头
  //    右向：→ ⇒ ⟶ ⟹ ➔ ➜ 等 → -->
  s = s.replace(/(\S)\s*[→⇒⟶⟹➔➜➝➞➟➠➣➤➥➦➧➨➩➪➭➮➯➱➺➻➼➽➾↠↣↦↪]\s*(\S)/g, '$1 --> $2')
  //    左向：← ⇐ ⟵ ⟸ 等 → <--
  s = s.replace(/(\S)\s*[←⇐⟵⟸]\s*(\S)/g, '$1 <-- $2')

  // 9) 规范容易混用的 ASCII 变体
  //    将 '->' 统一为 '-->'（避免单短横）
  s = s.replace(/-\s*>/g, '-->')
  //    将 '<-' 统一为 '<--'
  s = s.replace(/<\s*-/g, '<--')

  // 10) 如果缺少 graph 指令，则默认加上
  if (!/^\s*graph\s+/m.test(s)) {
    s = `graph TD\n${s.trim()}`
  }

  return { code: s, changed: s !== original }
}
