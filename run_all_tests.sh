#!/usr/bin/env bash
set -euo pipefail

# run_all_tests.sh
# Run all Godot and JavaScript tests from one command.
# Usage:
#   ./run_all_tests.sh
# or with custom Godot binary:
#   ./run_all_tests.sh /path/to/godot

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_DIR="$PROJECT_ROOT/scripts"

# Track test results
GODOT_TESTS_PASSED=0
GODOT_TESTS_FAILED=0
JS_TESTS_PASSED=0
JS_TESTS_FAILED=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "Running All Tests (Godot + JavaScript)"
echo "==========================================${NC}"
echo ""

# Run Godot Tests
echo -e "${BLUE}Running Godot Tests...${NC}"
echo ""
if bash "$SCRIPT_DIR/integrate_and_run_godot_tests.sh" "$@"; then
  GODOT_TESTS_PASSED=1
  echo -e "${GREEN}✓ Godot tests passed${NC}"
else
  GODOT_TESTS_FAILED=1
  echo -e "${RED}✗ Godot tests failed${NC}"
fi

echo ""
echo -e "${BLUE}Running JavaScript Tests...${NC}"
echo ""
if npm run test:unit; then
  JS_TESTS_PASSED=1
  echo -e "${GREEN}✓ JavaScript tests passed${NC}"
else
  JS_TESTS_FAILED=1
  echo -e "${RED}✗ JavaScript tests failed${NC}"
fi

echo ""
echo -e "${BLUE}=========================================="
echo "Test Summary"
echo "==========================================${NC}"
if [ "$GODOT_TESTS_PASSED" -eq 1 ]; then
  echo -e "${GREEN}✓ Godot tests PASSED${NC}"
else
  echo -e "${RED}✗ Godot tests FAILED${NC}"
fi

if [ "$JS_TESTS_PASSED" -eq 1 ]; then
  echo -e "${GREEN}✓ JavaScript tests PASSED${NC}"
else
  echo -e "${RED}✗ JavaScript tests FAILED${NC}"
fi
echo ""

# Exit with appropriate code
if [ "$GODOT_TESTS_FAILED" -eq 1 ] || [ "$JS_TESTS_FAILED" -eq 1 ]; then
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
