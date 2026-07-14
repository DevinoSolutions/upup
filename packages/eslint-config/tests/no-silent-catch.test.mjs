import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../rules/no-silent-catch.mjs';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

describe('upup/no-silent-catch', () => {
  it('enforces loud error handling', () => {
    tester.run('no-silent-catch', rule, {
      valid: [
        { code: 'try { f() } catch (e) { throw e }' },
        { code: 'try { f() } catch (e) { throw new UploadError("x", { cause: e }) }' },
        { code: 'try { f() } catch (e) { this.emit("upload-error", e) }' },
        { code: 'try { f() } catch (e) { emitter.emit("pipeline-error", { error: e }) }' },
        { code: 'try { f() } catch (e) { onError(e) }' },
        { code: 'try { f() } catch (e) { reportError(e) }' },
        {
          code: [
            'try { f() } catch {',
            '  // upup-catch: feature-detect probe; absence of API is the expected path',
            '}',
          ].join('\n'),
        },
      ],
      invalid: [
        { code: 'try { f() } catch (e) {}', errors: [{ messageId: 'silent' }] },
        { code: 'try { f() } catch {}', errors: [{ messageId: 'silent' }] },
        { code: 'try { f() } catch (e) { console.error(e) }', errors: [{ messageId: 'consoleOnly' }] },
        { code: 'try { f() } catch (e) { fallback = true }', errors: [{ messageId: 'silent' }] },
      ],
    });
  });
});
