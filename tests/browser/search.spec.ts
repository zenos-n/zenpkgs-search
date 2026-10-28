import { expect, test } from '@playwright/test';

const fixture = {
  pkgs: {
    'com.neg-zero.select-for-figma': { meta: { id: 'pkgs.com.neg-zero.select-for-figma', kind: 'package', name: 'Select for Figma', description: 'Native Figma client', categoryTarget: ['apps', 'graphics', 'select-for-figma'] } },
    byCategories: { sub: { apps: { sub: { graphics: { sub: { 'select-for-figma': { meta: { id: 'pkgs.com.neg-zero.select-for-figma', kind: 'package' } } } } } } } },
  },
  options: { 'programs.gnosis.enable': { meta: { type: 'boolean', default: false, description: 'Install Gnosis' } } },
  maintainers: { doromiert: { name: 'doromiert', github: 'doromiert' } },
};

test.beforeEach(async ({ page }) => {
  await page.route('https://raw.githubusercontent.com/zenos-n/zenpkgs/json/latestCommit.json', route => route.fulfill({ json: fixture }));
  await page.route('https://api.github.com/repos/zenos-n/zenpkgs/releases', route => route.fulfill({ json: [] }));
});

test('canonical package, search, scratchpad, and settings work without page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('1 entry', { exact: true })).toBeVisible();
  await expect(page.locator('.tree-row')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Search registry' }).fill('select');
  await page.locator('.tree-row').click();
  await expect(page.getByText('Native Figma client')).toBeVisible();
  await page.getByRole('button', { name: '+ Scratchpad' }).click();
  await expect(page.locator('textarea.scratchpad')).toContainText('com.neg-zero.select-for-figma');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Settings and news' }).click();
  await page.getByLabel('Theme').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});

test('large catalog keeps DOM rows bounded', async ({ page }) => {
  const many = { options: Object.fromEntries(Array.from({ length: 10_000 }, (_, i) => [`stress.option.${i}`, { meta: { type: 'boolean' } }])) };
  await page.route('https://raw.githubusercontent.com/zenos-n/zenpkgs/json/latestCommit.json', route => route.fulfill({ json: many }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Options' }).click();
  await expect(page.getByText('10,000 entries')).toBeVisible();
  expect(await page.locator('.tree-row').count()).toBeLessThan(100);
});
