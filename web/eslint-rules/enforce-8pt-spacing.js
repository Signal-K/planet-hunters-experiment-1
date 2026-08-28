// Rule: Enforce 8pt spacing grid (4, 8, 12, 16, 24, 32, 48, 64px only)
// Allows: CSS variables (gap-*, padding-*, margin-*), relative units (%, em, rem)
// Blocks: arbitrary pixel values like 11px, 23px, 37px, etc.

const VALID_STEPS = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256];
const PIXEL_PATTERN = /^(\d+)px$/;

function isValidSpacing(value) {
  const clean = value.trim().toLowerCase();

  // Allow CSS variables
  if (clean.startsWith('var(--')) return true;

  // Allow relative units (%, em, rem, vh, vw)
  if (/%|em|rem|vh|vw|ch|ex|vmin|vmax|cm|mm|in|pt|pc/.test(clean)) {
    return true;
  }

  // Allow keywords
  if (['auto', 'inherit', 'initial', 'unset', '0', 'none'].includes(clean)) {
    return true;
  }

  // Check pixel values against 8pt grid
  const match = clean.match(PIXEL_PATTERN);
  if (match) {
    const px = parseInt(match[1], 10);
    if (!VALID_STEPS.includes(px)) {
      return false;
    }
  }

  return true;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce 8pt spacing grid (only 4, 8, 12, 16, 24, 32, 48, 64px allowed). Use CSS variables or relative units.',
      category: 'Styling',
      recommended: true,
    },
    messages: {
      invalidSpacing: 'Spacing value "{{value}}" violates 8pt grid. Use 4, 8, 12, 16, 24, 32, 48, or 64px. Prefer CSS variables: var(--ln-spacing-*).',
    },
  },

  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && !isValidSpacing(node.value)) {
          context.report({
            node,
            messageId: 'invalidSpacing',
            data: { value: node.value },
          });
        }
      },

      TemplateElement(node) {
        if (!isValidSpacing(node.value.raw)) {
          context.report({
            node,
            messageId: 'invalidSpacing',
            data: { value: node.value.raw },
          });
        }
      },
    };
  },
};
