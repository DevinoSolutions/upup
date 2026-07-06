import noSilentCatch from './no-silent-catch.mjs';
import requireErrorTaxonomy from './require-error-taxonomy.mjs';

export default {
  meta: { name: 'eslint-plugin-upup', version: '1.0.0' },
  rules: {
    'no-silent-catch': noSilentCatch,
    'require-error-taxonomy': requireErrorTaxonomy,
  },
};
