import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import rule from '../rules/require-error-taxonomy.mjs';

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

describe('upup/require-error-taxonomy', () => {
  it('requires taxonomy errors with cause preservation', () => {
    tester.run('require-error-taxonomy', rule, {
      valid: [
        { code: 'throw new UploadError("boom")' },
        { code: 'throw new UploadValidationError("bad type")' },
        { code: 'try { f() } catch (e) { throw e }' },
        { code: 'try { f() } catch (e) { throw new UploadError("wrap", { cause: e }) }' },
      ],
      invalid: [
        { code: 'throw new Error("boom")', errors: [{ messageId: 'bareError' }] },
        { code: 'throw "boom"', errors: [{ messageId: 'nonError' }] },
        {
          code: 'try { f() } catch (e) { throw new UploadError("wrap") }',
          errors: [{ messageId: 'droppedCause' }],
        },
      ],
    });
  });
});
