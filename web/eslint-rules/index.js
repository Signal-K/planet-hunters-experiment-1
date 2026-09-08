// Custom ESLint plugin for Landnam design-token enforcement
// Rules ensure styling consistency: 8pt grid, CSS variables only, amber restrictions

module.exports = {
  rules: {
    'no-hardcoded-colors': require('./no-hardcoded-colors'),
    'enforce-8pt-spacing': require('./enforce-8pt-spacing'),
    'amber-only-in-rewards': require('./amber-only-in-rewards'),
  },
};
