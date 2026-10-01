/**
 * Pins the Angular majors @useupup/angular declares support for.
 *
 * The peers were `^19.0.0` only, so npm refused to install the package on
 * Angular 20+ with ERESOLVE even though the published build runs unchanged on
 * 20, 21 and 22 (zone and zoneless). Widening the range again, or narrowing
 * it, is a deliberate support change: update SUPPORTED_ANGULAR_VERSIONS here.
 */
import { describe, it, expect } from 'vitest'
import packageJson from '../package.json'

// Widened from the JSON literal type so a missing peer reads as undefined.
const peerDependencies: Partial<Record<string, string>> =
    packageJson.peerDependencies

const ANGULAR_PEERS = [
    '@angular/core',
    '@angular/common',
    '@angular/platform-browser',
]

const SUPPORTED_ANGULAR_VERSIONS = ['19.0.0', '20.0.0', '21.0.0', '22.0.0']

function parseVersion(version: string): [number, number, number] {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
    if (!match) throw new Error(`not a plain x.y.z version: "${version}"`)
    return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * Whether `version` satisfies `range`, where `range` is one or more caret
 * ranges (`^M.m.p`, major >= 1) joined by `||`. Any other syntax throws, so a
 * rewrite of the range forces a deliberate update here rather than a silent
 * pass. (No semver dependency in the workspace; this covers what we declare.)
 */
function satisfiesCaretRange(version: string, range: string): boolean {
    const [major, minor, patch] = parseVersion(version)
    return range.split('||').some(alternative => {
        const caret = /^\^([1-9]\d*\.\d+\.\d+)$/.exec(alternative.trim())
        if (!caret?.[1]) {
            throw new Error(`unsupported peer range syntax: "${alternative}"`)
        }
        const [floorMajor, floorMinor, floorPatch] = parseVersion(caret[1])
        if (major !== floorMajor) return false
        if (minor !== floorMinor) return minor > floorMinor
        return patch >= floorPatch
    })
}

describe('satisfiesCaretRange', () => {
    it('accepts versions inside a caret alternative and rejects other majors', () => {
        expect(satisfiesCaretRange('19.2.25', '^19.0.0')).toBe(true)
        expect(satisfiesCaretRange('20.0.0', '^19.0.0')).toBe(false)
        expect(satisfiesCaretRange('18.2.0', '^19.0.0 || ^20.0.0')).toBe(false)
        expect(satisfiesCaretRange('20.3.1', '^19.0.0 || ^20.0.0')).toBe(true)
        expect(satisfiesCaretRange('20.0.0', '^20.1.0')).toBe(false)
    })

    it('throws on range syntax it does not model instead of passing', () => {
        expect(() => satisfiesCaretRange('20.0.0', '>=19.0.0')).toThrow(
            'unsupported peer range syntax',
        )
    })
})

describe('@useupup/angular peer dependency range', () => {
    for (const peer of ANGULAR_PEERS) {
        it(`declares ${peer} as a peer that accepts Angular 19, 20, 21 and 22`, () => {
            const range = peerDependencies[peer]
            expect(range, `${peer} is missing from peerDependencies`).toEqual(
                expect.any(String),
            )
            const rejected = SUPPORTED_ANGULAR_VERSIONS.filter(
                version => !satisfiesCaretRange(version, range ?? ''),
            )
            expect(rejected, `${peer} peer range "${range}"`).toEqual([])
        })
    }
})
