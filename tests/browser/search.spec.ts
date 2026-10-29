import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = {
	pkgs: {
		'com.neg-zero.select-for-figma': {
			meta: {
				id: 'pkgs.com.neg-zero.select-for-figma',
				kind: 'package',
				name: 'Select for Figma',
				description: 'Native Figma client',
				categoryTarget: ['apps', 'graphics', 'select-for-figma']
			}
		},
		byCategories: {
			sub: {
				apps: {
					sub: {
						graphics: {
							sub: {
								'select-for-figma': {
									meta: { id: 'pkgs.com.neg-zero.select-for-figma', kind: 'package' }
								}
							}
						}
					}
				}
			}
		}
	},
	options: {
		programs: {
			sub: {
				gnosis: {
					sub: {
						enable: {
							meta: { type: 'boolean', default: false, description: 'Install Gnosis' }
						}
					}
				}
			}
		}
	},
	maintainers: { doromiert: { name: 'doromiert', github: 'doromiert' } }
};

test.beforeEach(async ({ page }) => {
	if (process.env.ZENPKGS_BROWSER_OFFLINE) {
		await page.route('http://127.0.0.1:4173/**', async (route) => {
			const name = new URL(route.request().url()).pathname;
			const file = resolve('dist', name === '/' ? 'index.html' : name.slice(1));
			const contentType = file.endsWith('.js')
				? 'text/javascript'
				: file.endsWith('.css')
					? 'text/css'
					: 'text/html';
			await route.fulfill({ body: readFileSync(file), contentType });
		});
	}
	await page.route(
		'https://raw.githubusercontent.com/zenos-n/zenpkgs/json/latestCommit.json',
		(route) => route.fulfill({ json: fixture })
	);
	await page.route('https://api.github.com/repos/zenos-n/zenpkgs/releases', (route) =>
		route.fulfill({ json: [] })
	);
});

test('canonical package, search, scratchpad, and settings work without page errors', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/');
	await expect(page.locator('.tree-row')).toHaveCount(2);
	await page.locator('.tree-row').filter({ hasText: 'By reverse DNS notation' }).click();
	await expect(page.locator('.tree-row').filter({ hasText: 'select-for-figma' })).toBeVisible();
	await page.getByRole('button', { name: 'Focus search' }).click();
	await page.getByRole('searchbox', { name: 'Search registry' }).fill('select');
	await page.locator('.tree-row').click();
	await expect(page.getByText('Native Figma client')).toBeVisible();
	await page.getByRole('button', { name: '+ Add to Scratchpad' }).click();
	await expect(page.getByRole('textbox', { name: 'Scratchpad configuration' })).toHaveValue(
		/com\.neg-zero\.select-for-figma/
	);
	await page.getByRole('button', { name: 'Clear scratchpad', exact: true }).click();
	await page.getByRole('button', { name: '+ Add to Scratchpad' }).click();
	await expect(page.getByRole('textbox', { name: 'Scratchpad configuration' })).toHaveValue(
		/com\.neg-zero\.select-for-figma/
	);
	await page
		.locator('.scratchpad-panel')
		.getByRole('button', { name: 'Close config scratchpad' })
		.click();
	await page.getByRole('button', { name: 'Open menu' }).click();
	await page.locator('.nav-menu').getByRole('button', { name: 'Settings' }).click();
	await page.getByLabel('Dark Mode').uncheck();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
	await page.getByRole('button', { name: 'Close' }).click();
	await page.getByRole('searchbox', { name: 'Search registry' }).fill('');
	await page.locator('.home-group button').filter({ hasText: 'programs' }).click();
	await page.locator('.home-group button').filter({ hasText: 'gnosis' }).click();
	await expect(page.locator('.home-group button').filter({ hasText: 'enable' })).toBeVisible();
	expect(errors).toEqual([]);
});

test('large catalog keeps DOM rows bounded', async ({ page }) => {
	const many = {
		options: Object.fromEntries(
			Array.from({ length: 10_000 }, (_, i) => [
				`stress.option.${i}`,
				{ meta: { type: 'boolean' } }
			])
		)
	};
	await page.route(
		'https://raw.githubusercontent.com/zenos-n/zenpkgs/json/latestCommit.json',
		(route) => route.fulfill({ json: many })
	);
	await page.goto('/');
	await page.getByRole('button', { name: 'Open menu' }).click();
	await page
		.locator('.nav-menu')
		.getByRole('button', { name: /Command Palette/ })
		.click();
	await page.locator('.command-list button').filter({ hasText: 'Options' }).click();
	await page.locator('.registry-row').filter({ hasText: 'stress' }).click();
	await page
		.locator('.registry-row')
		.filter({ has: page.locator('.row-label:text-is("option")') })
		.click();
	await expect(page.locator('.virtual-space')).toHaveAttribute('style', /440000px/);
  await expect.poll(() => page.locator('.virtual-space').evaluate(el => Math.round(el.parentElement!.getBoundingClientRect().height))).toBe(440000);
	expect(await page.locator('.registry-row').count()).toBeLessThan(100);
	await page
		.locator('.tree-scroll')
		.evaluate((element) => (element.scrollTop = element.scrollHeight));
	await expect(page.locator('.registry-row').last()).toContainText('9999');
	await page.getByRole('button', { name: 'Focus search' }).click();
	await page.getByRole('searchbox', { name: 'Search registry' }).fill('stress.option.1');
	await expect(page.locator('.tree-row').first()).toContainText('stress.option.1');
	await page.getByRole('searchbox', { name: 'Search registry' }).fill('');
	await page.setViewportSize({ width: 1440, height: 1400 });
	await page.locator('.tree-scroll').evaluate((element) => (element.scrollTop = 0));
	await expect.poll(() => page.locator('.registry-row').count()).toBeGreaterThan(25);
});

test('news creator, archive navigation, and option breadcrumbs work', async ({ page }) => {
	await page.route('https://raw.githubusercontent.com/zenos-n/zenpkgs/news/latest.json', (route) =>
		route.fulfill({
			json: {
				title: 'Latest update',
				date: '28.10.2026',
				content: 'News body',
				authors: ['doromiert']
			}
		})
	);
	await page.route('https://api.github.com/repos/zenos-n/zenpkgs/contents?ref=news', (route) =>
		route.fulfill({ json: [{ name: '27.10.2026-1.json' }] })
	);
	await page.route(
		'https://raw.githubusercontent.com/zenos-n/zenpkgs/news/27.10.2026-1.json',
		(route) =>
			route.fulfill({
				json: { title: 'Older update', date: '27.10.2026', content: 'Previous news' }
			})
	);
	await page.goto('/#options:programs.gnosis.enable');
	await expect(page.locator('.breadcrumbs .crumb-btn').last()).toHaveText('enable');
	await expect(page.locator('.breadcrumbs .crumb-btn')).toHaveCount(5);
	expect(
		await page.locator('.breadcrumbs').evaluate((element) => getComputedStyle(element).borderRadius)
	).toBe('8px');
	await page.getByRole('button', { name: 'Open menu' }).click();
	await page
		.locator('.nav-menu')
		.getByRole('button', { name: /Developer News/ })
		.click();
	await expect(page.locator('.news-article h1')).toHaveText('Latest update');
	await page.locator('.author-chip').click();
	await expect(page.locator('.maintainer-popover')).toContainText('doromiert');
	await page.getByRole('button', { name: 'View Archive' }).click();
	await expect(page.locator('.legacy-header h2')).toHaveText('News Archive');
	await page.locator('.news-archive .legacy-row').first().click();
	await expect(page.locator('.legacy-header h2')).toHaveText('Older update');
	await expect(page.locator('.news-article')).toContainText('Previous news');
	await page.getByRole('button', { name: 'Back' }).click();
	await expect(page.locator('.legacy-header h2')).toHaveText('News Archive');
});

test('category tree selects the canonical package', async ({ page }) => {
	await page.goto('/');
	await page.locator('.tree-row').filter({ hasText: 'By category' }).click();
	for (const label of ['apps', 'graphics', 'select-for-figma'])
		await page
			.locator('.tree-row')
			.filter({ has: page.locator(`.row-label:text-is("${label}")`) })
			.click();
	await expect(page.locator('.entry-id')).toHaveText('pkgs.com.neg-zero.select-for-figma');
	await expect(page.locator('.inspector')).not.toContainText('Category');
	await expect(page.locator('.inspector')).not.toContainText('Value for scratchpad');
});

test('release picker fetches registry versions and loads the selected catalog', async ({
	page
}) => {
	await page.route('https://api.github.com/repos/zenos-n/zenpkgs/releases', (route) =>
		route.fulfill({ json: [{ tag_name: 'v1' }, { tag_name: 'nzportable-maps-test' }] })
	);
	await page.route('https://raw.githubusercontent.com/zenos-n/zenpkgs/json/v1.json', (route) =>
		route.fulfill({ json: fixture })
	);
	await page.goto('/');
	await page.locator('.version-button').click();
	await expect(
		page.locator('.version-list').getByRole('button', { name: 'v1', exact: true })
	).toBeVisible();
	await expect(page.locator('.version-list')).not.toContainText('nzportable-maps-test');
	await page.locator('.version-list').getByRole('button', { name: 'v1', exact: true }).click();
	await expect(page.locator('.version-button')).toContainText('v1');
});

test('package and option branches share scrolling and transitions', async ({ page }) => {
	await page.goto('/');
	await page.locator('.tree-row').filter({ hasText: 'By category' }).click();
	const packageBranch = page.locator('.option-children').last();
	await expect(packageBranch).toBeVisible();
	await page.locator('.home-group button').filter({ hasText: 'programs' }).click();
	await expect(page.locator('.home-groups .option-children')).toBeVisible();
	expect(await page.locator('.tree-scroll').count()).toBe(1);
	await page.getByRole('button', { name: 'Open menu' }).click();
	await page
		.locator('.nav-menu')
		.getByRole('button', { name: /Settings/ })
		.click();
	const padding = await page.locator('.legacy-header').evaluate((el) => {
		const s = getComputedStyle(el);
		return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
	});
	expect(new Set(padding).size).toBe(1);
});
