import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, 'ConnectionStatus.css'), 'utf-8')

// Validates: Requirements 4.5
describe('ConnectionStatus stylesheet', () => {
  it('disables .status-spinner animation under prefers-reduced-motion: reduce', () => {
    const match = css.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?\})\s*\}/,
    )
    expect(match).not.toBeNull()
    const body = match![1]
    expect(body).toMatch(/\.status-spinner\s*\{[^}]*animation\s*:\s*none\s*;?[^}]*\}/)
  })
})
