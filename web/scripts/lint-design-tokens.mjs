#!/usr/bin/env node
/**
 * Design Token Linter for Landnam
 * Enforces:
 * - 8pt spacing grid (only 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256px)
 * - CSS variables for colors (no hardcoded hex/rgb/hsl)
 * - Amber restricted to reward contexts
 *
 * Run: npm run lint:design-tokens
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, '..');

// Config
const VALID_SPACING = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 256];
const HEX_COLOR_REGEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?/g;
const RGB_COLOR_REGEX = /rgb(?:a)?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;
const HSL_COLOR_REGEX = /hsl(?:a)?\s*\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?/g;
const PIXEL_VALUE_REGEX = /(\d+)px/g;
const AMBER_REGEX = /var\(--ln-amber\)|#f5a623|rgb\(245,\s*166,\s*35\)|hsl\(40,\s*96%,\s*55%\)/gi;
const REWARD_KEYWORDS = ['payout', 'reward', 'bonus', 'income', 'earnings', 'value', 'profit'];

// File patterns to check
const INCLUDE_PATTERNS = [
  /\.tsx?$/,  // TypeScript/TSX files
];

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /cypress/,
  /dist/,
  /.clause/,
  /eslint-rules/,
];

let issueCount = 0;
let filesChecked = 0;

function shouldCheckFile(filePath) {
  const relative = path.relative(WEB_ROOT, filePath);

  if (EXCLUDE_PATTERNS.some(p => p.test(relative))) {
    return false;
  }

  if (!INCLUDE_PATTERNS.some(p => p.test(filePath))) {
    return false;
  }

  return true;
}

function checkHardcodedColors(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Skip comments and string literals that are obviously not CSS
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // Check for hardcoded hex colors (exclude URLs, comments)
    const hexMatches = [...line.matchAll(HEX_COLOR_REGEX)];
    hexMatches.forEach(match => {
      // Skip if in comment
      if (line.substring(0, match.index).includes('//')) return;

      // Skip if it's a CSS variable reference
      if (line.substring(match.index - 10, match.index).includes('var(')) return;

      issues.push({
        type: 'hardcoded-color',
        line: lineNum,
        column: match.index + 1,
        value: match[0],
        message: `Hardcoded color "${match[0]}" found. Use CSS variable instead (var(--ln-*))`,
      });
    });

    // Check for rgb/hsl colors
    const rgbMatches = [...line.matchAll(RGB_COLOR_REGEX)];
    rgbMatches.forEach(match => {
      if (line.substring(0, match.index).includes('//')) return;
      issues.push({
        type: 'hardcoded-color',
        line: lineNum,
        column: match.index + 1,
        value: match[0],
        message: `Hardcoded rgb color found. Use CSS variable instead (var(--ln-*))`,
      });
    });
  });

  return issues;
}

function checkSpacingGrid(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // Find all pixel values
    const pixelMatches = [...line.matchAll(PIXEL_VALUE_REGEX)];
    pixelMatches.forEach(match => {
      // Skip if in comment
      if (line.substring(0, match.index).includes('//')) return;

      // Skip if it's a media query breakpoint (these have different rules)
      if (line.includes('@media') || line.includes('breakpoint')) return;

      const pxValue = parseInt(match[1], 10);
      if (!VALID_SPACING.includes(pxValue)) {
        issues.push({
          type: 'invalid-spacing',
          line: lineNum,
          column: match.index + 1,
          value: match[0],
          message: `Spacing value "${match[0]}" violates 8pt grid. Use 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, or 256px. Prefer CSS variables.`,
        });
      }
    });
  });

  return issues;
}

function checkAmberUsage(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    // Check if line has amber
    if (!AMBER_REGEX.test(line)) return;

    // Check if this is a reward context
    const hasRewardKeyword = REWARD_KEYWORDS.some(kw =>
      line.toLowerCase().includes(kw) ||
      lines.slice(Math.max(0, idx - 3), Math.min(lines.length, idx + 3))
        .join(' ')
        .toLowerCase()
        .includes(kw)
    );

    // Check for amber-allowed comment
    if (line.includes('amber allowed') || line.includes('amber exception')) return;

    if (!hasRewardKeyword) {
      issues.push({
        type: 'amber-out-of-context',
        line: lineNum,
        column: 1,
        value: 'amber',
        message: 'Amber color used outside reward context. Restrict --ln-amber to small reward/payout highlights only. Use --ln-cyan for UI chrome. Add "// amber allowed" comment if intentional.',
      });
    }
  });

  return issues;
}

function lintFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    filesChecked++;

    const allIssues = [
      ...checkHardcodedColors(content, filePath),
      ...checkSpacingGrid(content, filePath),
      ...checkAmberUsage(content, filePath),
    ];

    if (allIssues.length > 0) {
      const relative = path.relative(WEB_ROOT, filePath);
      console.log(`\n📄 ${relative}`);

      allIssues.forEach(issue => {
        const icon = issue.type === 'hardcoded-color' ? '🎨' :
                     issue.type === 'invalid-spacing' ? '📏' :
                     '💛';
        console.log(`  ${icon} Line ${issue.line}: ${issue.message}`);
        issueCount++;
      });
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_PATTERNS.some(p => p.test(fullPath))) {
        walkDir(fullPath);
      }
    } else if (shouldCheckFile(fullPath)) {
      lintFile(fullPath);
    }
  });
}

console.log('🔍 Checking design tokens...\n');
walkDir(path.join(WEB_ROOT, 'components'));
walkDir(path.join(WEB_ROOT, 'lib'));
walkDir(path.join(WEB_ROOT, 'app'));

console.log(`\n✅ Checked ${filesChecked} files`);
if (issueCount === 0) {
  console.log('✨ No design token violations found!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  Found ${issueCount} design token issues\n`);
  process.exit(1);
}
