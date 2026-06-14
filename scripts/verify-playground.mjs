import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
page.on('request', r => {
  if (r.url().includes('_auwla')) console.log('REQ', r.method(), r.url())
})
page.on('response', async r => {
  if (r.url().includes('_auwla')) {
    const text = await r.text().catch(() => '<binary>')
    console.log('RES', r.status(), r.url(), text.slice(0, 200))
  }
})

await page.goto('http://127.0.0.1:5173/')
await page.waitForTimeout(1000)
await page.click('a[href="/posts"]')
await page.waitForTimeout(2000)
await page.click('a[href="/login"]')
await page.waitForTimeout(1000)
await page.fill('input[name="username"]', 'admin')
await page.click('button[type="submit"]')
await page.waitForTimeout(2000)
await browser.close()
