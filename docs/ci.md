# CI

`ci.yml` is deliberately small: web typecheck and production build. Interactive
scene proof happens in the VS Code/Cursor Simple Browser using the independent
stage fixtures, so CI never downloads or runs a browser.

The required status is `CI required`. iOS is built locally on a macOS/Xcode host
when native code changes; browser runners and large test matrices are retired.
