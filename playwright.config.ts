import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/browser',
	timeout: 30_000,
	use: { baseURL: 'http://127.0.0.1:4173' },
	projects: [
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } },
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: { executablePath: process.env.ZENPKGS_CHROMIUM || undefined }
			}
		}
	],
	webServer: {
		command: 'npm run dev -- --port 4173 --strictPort',
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: !process.env.CI
	}
});
