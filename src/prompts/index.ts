import { basePrompt } from './base'
import { promptModes, type PromptMode } from './modes'

export function buildPrompt(enabledModes: Record<string, boolean>): string {
  let finalPrompt = basePrompt
  const enabledPrompts = Object.entries(enabledModes)
    .filter(([key, enabled]) => enabled && promptModes[key])
    .map(([key]) => promptModes[key].prompt)

  if (enabledPrompts.length > 0) {
    finalPrompt += `\n\n额外评分指南:\n${enabledPrompts.join('\n\n')}`
  }

  return finalPrompt
}

export { promptModes }
export type { PromptMode }
export { basePrompt }
