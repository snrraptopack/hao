import { test, expect } from '@playwright/test'

test('playground Link prefetch and navigation work without page errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', err => errors.push(err.message))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('http://127.0.0.1:5173/')
  await page.waitForSelector('a[href="/posts"]', { timeout: 5000 })
  await page.hover('a[href="/posts"]')
  await page.click('a[href="/posts"]')
  await page.waitForSelector('text=Posts', { timeout: 10000 })

  await page.click('a[href^="/posts/"]')
  await page.waitForSelector('text=Post details', { timeout: 10000 })

  await page.goBack()
  await page.waitForSelector('text=Posts', { timeout: 10000 })

  expect(errors).toEqual([])
})
