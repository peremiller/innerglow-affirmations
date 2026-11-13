import assert from "node:assert/strict";
import { chromium } from "playwright";

// Runs against the actual built Vite preview, without mocking the browser DOM.
const browser = await chromium.launch({ headless: true });
const origin = process.env.INNERGLOW_PREVIEW_URL || "http://127.0.0.1:4173";
try {
  for (const width of [320, 390, 1280]) {
    for (const colorScheme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width, height: 850 }, colorScheme });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(origin + "/#journal", { waitUntil: "networkidle" });
      await page.locator("#main-content").waitFor({ state: "visible" });
      const navSelector = await page.locator(".bottom-nav").isVisible() ? ".bottom-nav" : ".desktop-nav";
      assert.equal((await page.locator(navSelector + ' button[aria-current="page"]').textContent()).trim(), "Journal");
      await page.locator(navSelector).getByRole("button", { name: "Wishes" }).click();
      assert.equal(new URL(page.url()).hash, "#wishes");
      assert.equal((await page.locator(navSelector + ' button[aria-current="page"]').textContent()).trim(), "Wishes");
      await page.goBack({ waitUntil: "domcontentloaded" });
      assert.equal(new URL(page.url()).hash, "#journal");
      await page.waitForFunction(() => document.querySelector('.desktop-nav button[aria-current="page"]')?.textContent?.trim() === "Journal");
      await page.goForward({ waitUntil: "domcontentloaded" });
      assert.equal(new URL(page.url()).hash, "#wishes");
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(new URL(page.url()).hash, "#wishes");
      const skip = page.getByRole("link", { name: "Skip to content" });
      await skip.focus();
      await page.keyboard.press("Enter");
      assert.equal(new URL(page.url()).hash, "#wishes", "skip link must not lose current view");
      assert.equal(await page.evaluate(() => document.activeElement?.id), "main-content");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 2, `horizontal overflow at ${width}/${colorScheme}: ${overflow}px`);
      assert.deepEqual(errors, [], "no uncaught browser script errors");
      await context.close();
      console.log(`PASS Chromium navigation, keyboard and viewport ${width} ${colorScheme}`);
    }
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("igWishes", "{broken"));
  await page.goto(origin + "/#wishes", { waitUntil: "networkidle" });
  await page.getByRole("alert").filter({ hasText: "Existing records were not overwritten" }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem("igWishes")), "{broken");
  console.log("PASS Chromium corrupt existing wishlist record preserved and warning visible");
  await context.close();
} finally {
  await browser.close();
}
