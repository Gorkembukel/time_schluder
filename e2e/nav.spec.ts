import { test, expect } from '@playwright/test'

test('ana navigasyon ekranlar arasında geçiş yapar', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bugün' })).toBeVisible()

  await page.getByRole('link', { name: 'Finans' }).click()
  await expect(page.getByRole('heading', { name: 'Finans' })).toBeVisible()
})
