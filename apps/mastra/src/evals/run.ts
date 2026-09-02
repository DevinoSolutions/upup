import { MastraClient } from '@mastra/client-js'
import { EVAL_CASES, type EvalCase } from './canned-prompts.js'

/**
 * Run the canned-prompt eval against a running Mastra server.
 *
 *   pnpm --filter @useupup/mastra dev      # in another terminal
 *   pnpm --filter @useupup/mastra eval
 *
 * Exits 0 when all cases pass, non-zero otherwise. Suitable for CI as a
 * regression gate — break the agent, the build fails.
 */

type EvalResult =
    | { case: EvalCase; ok: true; patch: Record<string, unknown> }
    | {
          case: EvalCase
          ok: false
          reason: string
          patch?: Record<string, unknown>
      }

import { env } from '../lib/env.js'

const baseUrl = env.MASTRA_API_URL
const agentId = env.AGENT_ID
const FAIL_THRESHOLD = env.EVAL_FAIL_THRESHOLD

async function runOne(client: MastraClient, c: EvalCase): Promise<EvalResult> {
    try {
        const agent = client.getAgent(agentId)
        const response: any = await agent.generate(c.prompt)

        const patches: Record<string, unknown>[] = []
        // Same dedupe logic as useMastraChat — Mastra reports the same tool
        // result in both response.toolResults and response.steps[].toolResults.
        const seen = new Set<string>()
        const collect = (results: any[] | undefined) => {
            if (!Array.isArray(results)) return
            for (const r of results) {
                const id: string | undefined =
                    r?.toolCallId ?? r?.payload?.toolCallId
                if (id && seen.has(id)) continue
                const name = r?.toolName ?? r?.payload?.toolName
                if (
                    name !== 'apply-config-patch' &&
                    name !== 'applyConfigPatch'
                )
                    continue
                const data = r?.result ?? r?.payload?.result
                if (!data?.patch) continue
                if (id) seen.add(id)
                patches.push(data.patch)
            }
        }
        collect(response?.toolResults)
        if (Array.isArray(response?.steps)) {
            for (const step of response.steps) collect(step?.toolResults)
        }

        if (patches.length === 0) {
            return {
                case: c,
                ok: false,
                reason: 'agent did not call apply-config-patch',
            }
        }

        // Merge any multi-call patches into a single object for assertion.
        const merged = Object.assign({}, ...patches) as Record<string, unknown>

        for (const key of c.mustSet) {
            if (!(key in merged)) {
                return {
                    case: c,
                    ok: false,
                    reason: `missing required key "${key}"`,
                    patch: merged,
                }
            }
        }
        for (const key of c.mustNotTouch ?? []) {
            if (key in merged) {
                return {
                    case: c,
                    ok: false,
                    reason: `unexpectedly set "${key}"`,
                    patch: merged,
                }
            }
        }
        for (const [key, expected] of Object.entries(c.mustEqual ?? {})) {
            if (JSON.stringify(merged[key]) !== JSON.stringify(expected)) {
                return {
                    case: c,
                    ok: false,
                    reason: `key "${key}" should equal ${JSON.stringify(expected)}, got ${JSON.stringify(merged[key])}`,
                    patch: merged,
                }
            }
        }

        return { case: c, ok: true, patch: merged }
    } catch (e: unknown) {
        return {
            case: c,
            ok: false,
            reason: e instanceof Error ? e.message : 'unknown error',
        }
    }
}

async function main() {
    const client = new MastraClient({ baseUrl })

    console.log(`Running ${EVAL_CASES.length} eval cases against ${baseUrl}\n`)

    const results: EvalResult[] = []
    for (const c of EVAL_CASES) {
        const r = await runOne(client, c)
        results.push(r)
        const tag = r.ok ? 'PASS' : 'FAIL'
        const reason = r.ok ? '' : ` — ${r.reason}`
        console.log(`  [${tag}] ${c.name}${reason}`)
    }

    const failed = results.filter(r => !r.ok)
    const failRate = failed.length / results.length
    const summary = `\n${results.length - failed.length}/${results.length} passed (${(failRate * 100).toFixed(1)}% fail rate)`

    if (failed.length === 0) {
        console.log(`${summary} — all green.`)
        process.exit(0)
    }

    console.log(summary)
    console.log('\nFailures:')
    for (const f of failed as Extract<EvalResult, { ok: false }>[]) {
        console.log(`  ${f.case.name}:`)
        console.log(`    prompt:  ${f.case.prompt}`)
        console.log(`    reason:  ${f.reason}`)
        if (f.patch) console.log(`    patch:   ${JSON.stringify(f.patch)}`)
    }

    if (failRate > FAIL_THRESHOLD) {
        console.error(
            `\nFail rate ${(failRate * 100).toFixed(1)}% exceeds threshold ${(FAIL_THRESHOLD * 100).toFixed(1)}% — exiting non-zero.`,
        )
        process.exit(1)
    }
    console.log(
        `\nFail rate within tolerance (≤${(FAIL_THRESHOLD * 100).toFixed(1)}%) — exit 0.`,
    )
    process.exit(0)
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
