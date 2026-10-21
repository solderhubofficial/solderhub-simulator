import { expect, test, type Page } from "@playwright/test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const project = readFileSync(join(__dirname, "..", "examples/esp32/blink/blink-project.json"))

async function load(page: Page) {
  await page.goto("/")
  await page.locator('input[type="file"][accept*="json"]').setInputFiles({ name: "p.json", mimeType: "application/json", buffer: project })
  await expect(page.locator('g[data-component-id="led1"][transform]').first()).toBeVisible()
}
const part = (page: Page, id: string) => page.locator(`g[data-component-id="${id}"][transform]`).first()
const centre = (page: Page, id: string) => part(page, id).evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })

test.describe("appearance preferences", () => {
  test("switches between light and dark and remembers the choice", async ({ page }) => {
    await page.goto("/")
    const appearance = page.getByRole("combobox", { name: "Appearance" })
    await expect(appearance).toHaveValue("system")

    await appearance.selectOption("dark")
    await expect(page.locator("html")).toHaveClass(/dark/)
    await page.reload()
    await expect(page.getByRole("combobox", { name: "Appearance" })).toHaveValue("dark")
    await expect(page.locator("html")).toHaveClass(/dark/)

    await page.getByRole("combobox", { name: "Appearance" }).selectOption("light")
    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })

  test("system mode follows the device appearance", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" })
    await page.goto("/")
    await expect(page.getByRole("combobox", { name: "Appearance" })).toHaveValue("system")
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})

test.describe("part selection and rotation (desktop)", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("selecting a part shows a small toolbar, not a side inspector", async ({ page }) => {
    await load(page)
    await part(page, "led1").click({ force: true })
    const toolbar = page.getByTestId("part-toolbar")
    await expect(toolbar).toBeVisible()
    const box = (await toolbar.boundingBox())!
    expect(box.width).toBeLessThan(260)
    expect(box.height).toBeLessThan(80)
    await expect(page.getByRole("button", { name: "Close inspector" })).toHaveCount(0)
    // Parts with adjustable values get Settings; it opens a popover with the real control.
    await part(page, "r1").click({ force: true })
    await page.getByRole("button", { name: "Settings" }).click()
    await expect(page.getByText("Resistance", { exact: false }).first()).toBeVisible()
  })

  test("rotating turns the part about its own centre (no jump)", async ({ page }) => {
    await load(page)
    for (const id of ["r1", "led1", "esp32-1"]) {
      await part(page, id).click({ force: true })
      const before = await centre(page, id)
      for (let i = 0; i < 4; i++) {
        await page.getByRole("button", { name: "Rotate right" }).click()
        const now = await centre(page, id)
        // Artwork is not perfectly centred in its box, so allow a small drift, never a jump.
        expect(Math.abs(now.x - before.x)).toBeLessThan(25)
        expect(Math.abs(now.y - before.y)).toBeLessThan(25)
      }
    }
  })

  test("R rotates the selected part", async ({ page }) => {
    await load(page)
    await part(page, "led1").click({ force: true })
    const tf = () => part(page, "led1").getAttribute("transform")
    const before = await tf()
    await page.keyboard.press("r")
    expect(await tf()).not.toBe(before)
  })

  test("opening the code editor keeps the whole circuit visible beside it", async ({ page }) => {
    await load(page)
    await page.getByRole("button", { name: "Code", exact: true }).click()
    await expect(page.getByTestId("editor-target")).toBeVisible()
    await page.waitForTimeout(800)
    const panel = (await page.getByRole("separator", { name: "Resize code editor" }).locator("..").boundingBox())!
    for (const id of ["esp32-1", "r1", "led1"]) {
      const b = (await part(page, id).boundingBox())!
      expect(b.x + b.width).toBeLessThanOrEqual(panel.x + 2)
    }
  })
})

test.describe("mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test("the code editor sheet clears the tool rail and the page does not scroll sideways", async ({ page }) => {
    await load(page)
    await page.getByRole("button", { name: "Code", exact: true }).click()
    await expect(page.getByTestId("editor-target")).toBeVisible()
    const rail = (await page.getByRole("complementary", { name: "Workbench tools" }).boundingBox())!
    const panel = (await page.getByRole("separator", { name: "Resize code editor" }).locator("..").boundingBox())!
    expect(panel.x).toBeGreaterThanOrEqual(rail.x + rail.width - 1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
})
