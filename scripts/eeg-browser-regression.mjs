#!/usr/bin/env node
/**
 * Focused browser regression for EEG review interactions.
 *
 * This deliberately exercises the workstation rather than repeating the
 * generic page/console smoke check. Start the app first, then run:
 *
 *   node scripts/eeg-browser-regression.mjs http://127.0.0.1:8080/
 */

import assert from "node:assert/strict";
import { chromium } from "playwright";

const url = process.argv[2] || process.env.EEG_BROWSER_URL || "http://127.0.0.1:8080/";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const pageErrors = [];
const consoleErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});

function followButton() {
  return page.locator('button[aria-label*="follow playhead" i]');
}

async function canvasMetrics() {
  return page.evaluate(() =>
    [...document.querySelectorAll("canvas")].map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return {
        width: canvas.width,
        height: canvas.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
      };
    }),
  );
}

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await page.locator("canvas").first().waitFor({ state: "visible", timeout: 45_000 });
  await followButton().waitFor({ state: "visible", timeout: 45_000 });

  const initialCanvases = await canvasMetrics();
  assert.ok(initialCanvases.length >= 4, "expected editor, overlays, overview, and DSA canvases");
  for (const canvas of initialCanvases) {
    assert.ok(canvas.width >= Math.floor(canvas.cssWidth * 1.9), "canvas lost Retina backing resolution");
    assert.ok(canvas.height >= Math.floor(canvas.cssHeight * 1.9), "canvas lost Retina backing resolution");
  }

  if ((await followButton().getAttribute("aria-pressed")) !== "true") await followButton().click();
  assert.equal(await followButton().getAttribute("aria-pressed"), "true");

  // Playback and the cursor must keep follow mode active while routine review
  // controls invalidate/rebuild the display window.
  await page.waitForFunction(() => {
    const play = document.querySelector('button[aria-label="Play"]');
    return Boolean(play && !play.disabled);
  });
  await page.getByRole("button", { name: "Play" }).click();
  const filters = [
    ["LFF", "0.5"],
    ["HFF", "35"],
    ["Notch", "on"],
    ["LFF", "1.6"],
    ["HFF", "70"],
    ["Notch", "off"],
  ];
  for (const [label, value] of filters) {
    const select = page.locator("label").filter({ hasText: label }).locator("select").first();
    await select.selectOption(value);
    assert.equal(await followButton().getAttribute("aria-pressed"), "true", `${label} disabled follow`);
  }

  const montage = page.locator("label").filter({ hasText: "Montage" }).locator("select").first();
  await montage.selectOption("original");
  assert.equal(await followButton().getAttribute("aria-pressed"), "true", "montage disabled follow");
  await montage.selectOption("double-banana");
  assert.equal(await followButton().getAttribute("aria-pressed"), "true", "montage restore disabled follow");

  // Focus mode is a chrome-only toggle. It must not be triggered while an
  // editable control owns the keyboard, and must round-trip via Ctrl/Cmd+Shift+F.
  const jump = page.locator("#jump");
  await jump.focus();
  await page.keyboard.press("f");
  assert.equal(await followButton().getAttribute("aria-pressed"), "true", "typing target consumed as a shortcut");
  await page.locator("body").click({ position: { x: 900, y: 300 } });
  await page.keyboard.press("Control+Shift+f");
  await page.locator(".workstation-focus").waitFor({ state: "attached" });
  assert.equal(await page.locator(".workstation-header").count(), 0, "focus mode left full chrome visible");
  await page.keyboard.press("Control+Shift+f");
  await page.locator(".workstation-header").waitFor({ state: "visible" });

  // Add/select a marker through the real event workflow; selection must remain
  // synchronized with the review cursor while follow is active.
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await page.getByRole("button", { name: /Add at/ }).click();
  await page.locator('[aria-label="Selected marker"]').waitFor({ state: "visible" });
  assert.equal(await followButton().getAttribute("aria-pressed"), "true", "annotation selection disabled follow");

  // Rapid review navigation and resize are intentionally repeated to catch
  // stale RAF/canvas state and viewport invalidation races.
  await page.locator("body").click({ position: { x: 900, y: 300 } });
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i % 2 ? "PageDown" : "PageUp");
    await page.keyboard.press("ArrowRight");
  }
  await page.setViewportSize({ width: 1080, height: 720 });
  await page.waitForTimeout(100);
  const resizedCanvases = await canvasMetrics();
  assert.equal(resizedCanvases.length, initialCanvases.length, "resize dropped a canvas layer");
  for (const canvas of resizedCanvases) {
    assert.ok(canvas.width >= Math.floor(canvas.cssWidth * 1.9), "resize lost Retina backing resolution");
    assert.ok(canvas.height >= Math.floor(canvas.cssHeight * 1.9), "resize lost Retina backing resolution");
  }

  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join(" | ")}`);
  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join(" | ")}`);
  console.log(JSON.stringify({ ok: true, url, canvases: resizedCanvases.length, pageErrors, consoleErrors }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, url, error: String(error?.message || error), pageErrors, consoleErrors }, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
