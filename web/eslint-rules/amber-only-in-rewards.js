// Rule: Amber (--ln-amber) is restricted to small reward elements only
// Blocks: amber used in panel backgrounds, buttons, generic UI chrome
// Allows: reward value highlights, small accent elements with 'reward' in context

const AMBER_PATTERN = /--ln-amber|#f5a623|rgb\(245,\s*166,\s*35\)|hsl\(40,\s*96%,\s*55%\)/i;
const REWARD_KEYWORDS = ['payout', 'reward', 'bonus', 'income', 'profit', 'earnings', 'value'];
const EXEMPT_PATTERNS = [
  // Contractor brand colors (per-client identity colors are OK)
  /contractor.*color|client.*color|brand.*color/i,
  // Explicitly documented exceptions
  /\/\/ amber (?:allowed|exception|contract)/i,
];

function isRewardContext(sourceCode, node) {
  // Check surrounding code for reward-related keywords
  const source = sourceCode.getText();
  const nodeStart = Math.max(0, node.range[0] - 200);
  const nodeEnd = Math.min(source.length, node.range[1] + 200);
  const context = source.substring(nodeStart, nodeEnd);

  // Check for reward keywords
  for (const keyword of REWARD_KEYWORDS) {
    if (context.toLowerCase().includes(keyword)) return true;
  }

  // Check for data-testid with 'reward' or 'payout'
  if (/data-testid="[^"]*(?:reward|payout)[^"]*"/.test(context)) return true;

  // Check for variable names
  if (/(?:reward|payout|bonus|income)[A-Za-z]*/.test(context)) return true;

  return false;
}

function isAmberUsage(value) {
  return AMBER_PATTERN.test(value);
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Restrict amber (--ln-amber) to small reward-context elements only. Never use for panels, buttons, or generic UI chrome.',
      category: 'Styling',
      recommended: true,
    },
    messages: {
      amberOutOfContext: 'Amber color used outside reward context. Restrict --ln-amber to small reward/payout highlights only. For UI chrome, use --ln-cyan instead. Add "// amber allowed" comment if this is intentional.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode;

    return {
      Literal(node) {
        if (typeof node.value === 'string' && isAmberUsage(node.value)) {
          // Check if this is an exempt pattern
          if (EXEMPT_PATTERNS.some(p => p.test(sourceCode.getText(node)))) {
            return;
          }

          // Check if in reward context
          if (!isRewardContext(sourceCode, node)) {
            context.report({
              node,
              messageId: 'amberOutOfContext',
            });
          }
        }
      },

      TemplateElement(node) {
        if (isAmberUsage(node.value.raw)) {
          if (!isRewardContext(sourceCode, node)) {
            context.report({
              node,
              messageId: 'amberOutOfContext',
            });
          }
        }
      },
    };
  },
};
