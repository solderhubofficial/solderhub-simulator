import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const project = readFileSync(join(__dirname, "..", "examples/esp32/blink/blink-project.json"))

async function loadProject(page: Page) {
  await page.goto("/")
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({ name: "blink-project.json", mimeType: "application/json", buffer: project })
  await expect(page.getByTestId("editor-target")).toContainText(/esp32/i)
}

const ledOn = (page: Page) => page.locator('[data-component-id="led1"]').getAttribute("data-led-on")

test("compiles real firmware, runs it in the emulator and blinks the wired LED", async ({ page }) => {
  await loadProject(page)
  await expect(page.getByTestId("esp32-run")).toBeDisabled() // no artifact yet

  await page.getByTestId("esp32-compile").click()
  await expect(page.getByTestId("esp32-status")).toHaveAttribute("data-esp32-build", "fresh")
  await page.getByTestId("esp32-run").click()
  await expect(page.getByTestId("esp32-status")).toHaveAttribute("data-esp32-runtime", "running")

  const seen = new Set<string | null>()
  const deadline = Date.now() + 30_000
  let transitions = 0
  let prev: string | null = null
  while (Date.now() < deadline && transitions < 4) {
    const v = await ledOn(page)
    seen.add(v)
    if (prev !== null && v !== prev) transitions += 1
    prev = v
    await page.waitForTimeout(50)
  }
  expect(seen).toEqual(new Set(["true", "false"]))
  expect(transitions).toBeGreaterThanOrEqual(4)

  // Stop restores a clean circuit: the LED goes dark and stays dark.
  await page.getByTestId("esp32-stop").click()
  await expect(page.getByTestId("esp32-status")).not.toHaveAttribute("data-esp32-runtime", "running")
  await page.waitForTimeout(1200)
  expect(await ledOn(page)).toBe("false")
  const after = await ledOn(page)
  await page.waitForTimeout(1200)
  expect(await ledOn(page)).toBe(after)

  // Run again from the same build, then Reset reboots it and it keeps blinking.
  await page.getByTestId("esp32-run").click()
  await expect(page.getByTestId("esp32-status")).toHaveAttribute("data-esp32-runtime", "running")
  await page.getByTestId("esp32-reset").click()
  await expect(page.getByTestId("esp32-status")).toHaveAttribute("data-esp32-runtime", "running")
  await expect.poll(() => ledOn(page), { timeout: 20_000 }).toBe("true")
  await expect.poll(() => ledOn(page), { timeout: 20_000 }).toBe("false")
})

test("a real compile error shows file/line diagnostics and leaves Run disabled", async ({ page }) => {
  await loadProject(page)
  await page.locator(".cm-content").click()
  await page.keyboard.press("Control+End")
  await page.keyboard.type("\nvoid broken() { this_is_not_declared(); }\n")
  await page.getByTestId("esp32-compile").click()
  await expect(page.getByTestId("esp32-status")).toContainText(/not declared|error/i)
  await expect(page.getByTestId("esp32-status")).toHaveAttribute("data-esp32-build", "none")
  await expect(page.getByTestId("esp32-run")).toBeDisabled()
})
