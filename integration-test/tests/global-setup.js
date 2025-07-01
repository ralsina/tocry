import { chromium } from '@playwright/test'

async function globalSetup () {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:3000') // Or any page that loads your app
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-test-mode', 'true')
  })
  await browser.close()
}

export default globalSetup
