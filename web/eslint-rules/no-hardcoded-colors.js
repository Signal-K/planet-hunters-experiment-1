// Rule: Enforce CSS variables for all colors, no hardcoded hex/rgb values
// Allows: var(--ln-*), CSS keywords (transparent, currentColor), theme()
// Blocks: #abc123, rgb(255,0,0), hsl(0,100%,50%), 'red'

const HEX_PATTERN = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?/;
const RGB_PATTERN = /rgb(?:a)?\s*\(/;
const HSL_PATTERN = /hsl(?:a)?\s*\(/;
const COLOR_KEYWORDS = new Set(['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey']);

function isColorKeyword(value) {
  const clean = value.trim().toLowerCase();
  return COLOR_KEYWORDS.has(clean) && !['transparent', 'currentColor', 'inherit', 'unset', 'initial'].includes(clean);
}

function isHardcodedColor(value) {
  const clean = value.trim();

  // Allow CSS variables
  if (clean.startsWith('var(--ln-')) return false;
  if (clean.includes('var(--')) return false;

  // Allow safe keywords
  if (['transparent', 'currentColor', 'inherit', 'unset', 'initial'].includes(clean.toLowerCase())) {
    return false;
  }

  // Block hardcoded colors
  if (HEX_PATTERN.test(clean)) return true;
  if (RGB_PATTERN.test(clean)) return true;
  if (HSL_PATTERN.test(clean)) return true;
  if (isColorKeyword(clean)) return true;

  return false;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce CSS variables (var(--ln-*)) for all colors; no hardcoded hex/rgb/hsl/keywords',
      category: 'Styling',
      recommended: true,
    },
    messages: {
      hardcodedColor: 'Use CSS variable instead of hardcoded color "{{value}}". Use var(--ln-*) tokens from globals.css.',
    },
  },

  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === 'string' && isHardcodedColor(node.value)) {
          context.report({
            node,
            messageId: 'hardcodedColor',
            data: { value: node.value },
          });
        }
      },

      TemplateElement(node) {
        if (isHardcodedColor(node.value.raw)) {
          context.report({
            node,
            messageId: 'hardcodedColor',
            data: { value: node.value.raw },
          });
        }
      },
    };
  },
};
