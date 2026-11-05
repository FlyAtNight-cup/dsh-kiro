/**
 * Lifecycle contract for the client entry.
 *
 * DSH 0.2's client module system tears an entry's fiber down and re-applies the
 * plugin after a plugin update. A locale registration that is not owned by that
 * fiber survives the teardown, so the next apply throws
 * `locale namespace "dsh-kiro" already has locale "en"` and the plugin inventory
 * page reports that the plugin could not sync. These tests run the shipped
 * bundle twice across a teardown to pin that contract.
 */

import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../client/index.cjs', import.meta.url), 'utf8')

interface Harness {
  apply: () => void
  dispose: () => void
  locales: Map<string, Set<string>>
}

/** Minimal host: a locale service that refuses duplicate registrations. */
function harness(shared?: Map<string, Set<string>>): Harness {
  ;(globalThis as any).window = {
    __ModuleLoader__: { load: (definition: unknown) => { registration = definition } },
    setInterval: () => 0,
    clearInterval: () => undefined,
    setTimeout: (callback: () => void) => { callback(); return 0 },
    clearTimeout: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    requestAnimationFrame: (callback: () => void) => { callback(); return 0 },
    confirm: () => true,
    location: { href: 'http://localhost/' },
  }
  ;(globalThis as any).document = {
    getElementById: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, appendChild: () => undefined }),
    head: { appendChild: () => undefined },
    body: { appendChild: () => undefined },
    documentElement: {},
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }
  ;(globalThis as any).MutationObserver = class {
    observe(): void {}
    disconnect(): void {}
  }

  let registration: any
  ;(0, eval)(source)
  const module = registration.factory((name: string) => {
    if (name === 'react') return { createElement: () => null, Fragment: Symbol('Fragment') }
    throw new Error('unexpected module ' + name)
  })

  const locales = shared ?? new Map<string, Set<string>>()
  const disposers: (() => void)[] = []
  const slot = { register: () => () => undefined, inject: (_name: string, use: () => void) => use() }
  const scope: any = {
    effect: (run: () => unknown) => {
      const dispose = run()
      if (typeof dispose === 'function') disposers.push(dispose as () => void)
      return dispose
    },
    locale: {
      register: (ns: string, dictionaries: Record<string, unknown>) => {
        const existing = locales.get(ns) ?? new Set<string>()
        for (const locale of Object.keys(dictionaries)) {
          if (existing.has(locale)) {
            throw new Error(`locale namespace "${ns}" already has locale "${locale}"`)
          }
        }
        for (const locale of Object.keys(dictionaries)) existing.add(locale)
        locales.set(ns, existing)
        return () => {
          for (const locale of Object.keys(dictionaries)) existing.delete(locale)
        }
      },
      bind: () => (key: string) => key,
      resolveText: (value: unknown) => value,
    },
    slots: slot,
    modelDirectories: { directoryFor: () => ({ store: {} }) },
    logger: { error: () => undefined, warn: () => undefined },
    inject: (_names: string[], use: (host: unknown) => void) => use(scope),
  }
  const ctx = { ...scope, locale: scope.locale, slots: slot }
  return {
    apply: () => module.apply(ctx),
    dispose: () => {
      for (const dispose of disposers.splice(0).reverse()) dispose()
    },
    locales,
  }
}

describe('client entry lifecycle', () => {
  afterEach(() => {
    delete (globalThis as any).window
    delete (globalThis as any).document
    delete (globalThis as any).MutationObserver
  })

  it('owns its locale registration so a re-applied entry does not collide', () => {
    const first = harness()
    first.apply()
    expect(first.locales.get('dsh-kiro')).toEqual(new Set(['en', 'zh']))

    first.dispose()
    expect(first.locales.get('dsh-kiro')).toEqual(new Set())

    // The host keeps one locale service across the entry replacement.
    const second = harness(first.locales)
    expect(() => second.apply()).not.toThrow()
    expect(second.locales.get('dsh-kiro')).toEqual(new Set(['en', 'zh']))
  })

  it('fails loudly instead of hiding an unowned duplicate', () => {
    const host = harness()
    host.apply()
    // Same fiber applying twice is a host bug: the service must still refuse a
    // silent second registration rather than leaving two owners for one dictionary.
    expect(() => host.apply()).toThrow(/already has locale/)
  })
})
