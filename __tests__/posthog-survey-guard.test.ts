/**
 * Static regression tests for PostHog native survey guards in react-shell.js.
 *
 * These tests parse the source file as text rather than executing it (the file
 * uses CDN ESM imports that are not available in Node). They assert that the
 * structural guards required to prevent native PostHog popovers from
 * auto-rendering on page load are all present and correctly wired up.
 */

import fs from "fs";
import path from "path";
import { describe, expect, test } from "@jest/globals";

const shellSrc = fs.readFileSync(
  path.resolve(__dirname, "../react-shell.js"),
  "utf8"
);

describe("PostHog native survey guard — react-shell.js", () => {
  test("disable_surveys: true is present in posthog init config", () => {
    expect(shellSrc).toMatch(/disable_surveys\s*:\s*true/);
  });

  test("disableNativePostHogSurveys function is defined", () => {
    expect(shellSrc).toMatch(/function\s+disableNativePostHogSurveys\s*\(/);
  });

  test("disableNativePostHogSurveys is called in the loaded() callback", () => {
    // The loaded callback must call disableNativePostHogSurveys(ph) before
    // ph.register() so survey APIs are stubbed as early as possible.
    const loadedBlock = shellSrc.match(/loaded\(ph\)\s*\{([\s\S]*?)\}/);
    expect(loadedBlock).not.toBeNull();
    expect(loadedBlock![1]).toMatch(/disableNativePostHogSurveys\s*\(\s*ph\s*\)/);
  });

  test("disableNativePostHogSurveys is called on the client after init()", () => {
    // Belt-and-suspenders: must also be called immediately after client.init()
    // returns in case the loaded callback fires asynchronously.
    const afterInit = shellSrc.match(
      /client\.init\([^)]*\{[\s\S]*?\}\s*\);\s*([\s\S]*?)return client;/
    );
    expect(afterInit).not.toBeNull();
    expect(afterInit![1]).toMatch(/disableNativePostHogSurveys\s*\(\s*client\s*\)/);
  });

  test("maybeShowReturnVisitSurvey only arms _pendingReturnVisitSurvey — does not open a survey", () => {
    const fnMatch = shellSrc.match(
      /function\s+maybeShowReturnVisitSurvey\s*\(\)([\s\S]*?)^}/m
    );
    expect(fnMatch).not.toBeNull();
    const body = fnMatch![1];
    // Must set the pending flag
    expect(body).toMatch(/_pendingReturnVisitSurvey\s*=\s*true/);
    // Must NOT directly call showInlineSurvey or maybeTriggerMicroSurvey
    expect(body).not.toMatch(/showInlineSurvey\s*\(/);
    expect(body).not.toMatch(/maybeTriggerMicroSurvey\s*\(/);
  });

  test("surveys.loadIfEnabled is stubbed to a noop inside disableNativePostHogSurveys", () => {
    const fnMatch = shellSrc.match(
      /function\s+disableNativePostHogSurveys\s*\([\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toMatch(/surveys\.loadIfEnabled\s*=\s*noop/);
  });

  test("surveys.getActiveMatchingSurveys is stubbed inside disableNativePostHogSurveys", () => {
    const fnMatch = shellSrc.match(
      /function\s+disableNativePostHogSurveys\s*\([\s\S]*?^}/m
    );
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toMatch(/surveys\.getActiveMatchingSurveys\s*=\s*noopAsync/);
  });
});
