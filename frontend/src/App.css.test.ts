import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, 'App.css'), 'utf-8')

// Validates: Requirements 2.1, 2.4
describe('App stylesheet', () => {
  it('lays the agent details and location panel out in a row', () => {
    expect(css).toMatch(/\.agent-layout\s*\{[^}]*display\s*:\s*flex\s*;[^}]*flex-direction\s*:\s*row/)
  })

  it('stacks the panel below the details under max-width: 699px', () => {
    const match = css.match(/@media\s*\(\s*max-width\s*:\s*699px\s*\)\s*\{([\s\S]*)\}\s*$/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/\.agent-layout\s*\{[^}]*flex-direction\s*:\s*column/)
  })
})
