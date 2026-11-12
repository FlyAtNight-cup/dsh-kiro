/**
 * Kiro client-version floor.
 *
 * Kiro refuses clients older than a published IDE/CLI floor with
 * "This version of Kiro is no longer supported." The service reads the
 * `KiroIDE-<version>` token from the request identity, so this test keeps the
 * shared constant above the floor announced for 2026-11-09.
 */

import { describe, expect, it } from 'vitest'
import { KIRO_IDE_VERSION, KIRO_USER_AGENT } from '../src/client-identity.ts'

/** Oldest Kiro IDE release Kiro still accepts (announced 2026-11-09). */
const IDE_FLOOR = [0, 11, 133] as const

function versionTuple(value: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(value)
  if (match === null) throw new Error(`not a release version: ${value}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

describe('Kiro client identity', () => {
  it('names the release in the exact token the service parses', () => {
    expect(KIRO_USER_AGENT).toBe(`aws-sdk-js/1.0.0 KiroIDE-${KIRO_IDE_VERSION}`)
    expect(KIRO_USER_AGENT.endsWith(`KiroIDE-${KIRO_IDE_VERSION}`)).toBe(true)
  })

  it('stays at or above the service version floor', () => {
    const [major, minor, patch] = versionTuple(KIRO_IDE_VERSION)
    const [floorMajor, floorMinor, floorPatch] = IDE_FLOOR
    const newer = major > floorMajor
      || major === floorMajor && (minor > floorMinor || minor === floorMinor && patch >= floorPatch)
    expect(newer).toBe(true)
  })
})
