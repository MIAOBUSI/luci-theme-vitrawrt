#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

function usage() {
	console.log(`Usage: node scripts/visual-identity-audit.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --output-dir <dir>    Output directory. Default: audit-output/visual-identity-1.11/<timestamp>
  --browser <name>      chromium, webkit, or firefox. Default: chromium
  --headed              Run headed browser
  -h, --help            Show help`);
}

function fail(message) {
	console.error(`visual-identity-audit: ${message}`);
	process.exit(1);
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		luciUser: 'root',
		luciPassword: '',
		outputDir: '',
		browser: 'chromium',
		headed: false
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];

		if (arg === '--host')
			args.host = argv[++i] || fail('--host requires a value');
		else if (arg === '--luci-user')
			args.luciUser = argv[++i] || fail('--luci-user requires a value');
		else if (arg === '--luci-password')
			args.luciPassword = argv[++i] ?? '';
		else if (arg === '--output-dir')
			args.outputDir = argv[++i] || fail('--output-dir requires a value');
		else if (arg === '--browser')
			args.browser = argv[++i] || fail('--browser requires a value');
		else if (arg === '--headed')
			args.headed = true;
		else if (arg === '-h' || arg === '--help') {
			usage();
			process.exit(0);
		}
		else
			fail(`unknown option: ${arg}`);
	}

	return args;
}

async function loadPlaywright() {
	try {
		return await import('playwright');
	}
	catch (err) {
		const fallback = process.env.PLAYWRIGHT_PACKAGE_PATH || '/tmp/vitrawrt-pw/node_modules/playwright/index.mjs';
		try {
			return await import(fallback);
		}
		catch (_) {
			console.error('Playwright is not available.');
			console.error('Install it or run with PLAYWRIGHT_PACKAGE_PATH=/tmp/vitrawrt-pw/node_modules/playwright/index.mjs');
			throw err;
		}
	}
}

function stamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function normalizeHost(host) {
	return /^https?:\/\//.test(host) ? host.replace(/\/$/, '') : `http://${host}`;
}

function safeName(value) {
	return String(value).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'page';
}

async function ensureDir(dir) {
	await fs.mkdir(dir, { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function launchBrowser(playwright, args) {
	const requested = playwright[args.browser] || fail(`unsupported browser: ${args.browser}`);
	const launchOptions = { headless: !args.headed };

	if (args.browser === 'chromium')
		launchOptions.args = ['--single-process', '--no-zygote', '--disable-gpu', '--disable-dev-shm-usage'];

	return await requested.launch(launchOptions);
}

async function newPage(browser, viewport, mode) {
	const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });

	await page.addInitScript((themeMode) => {
		try {
			localStorage.setItem('vitrawrt.theme', themeMode);
			localStorage.setItem('vitrawrt.glass', 'auto');
		}
		catch (e) {}
	}, mode);

	return page;
}

async function waitForLuCIView(page) {
	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
	await page.waitForFunction(() => {
		const view = document.querySelector('#view');
		if (!view)
			return true;
		const children = Array.from(view.children).filter((child) => child.nodeType === 1);
		return !(children.length === 1 && children[0].classList.contains('spinning'));
	}, null, { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(1000);
}

async function login(page, baseUrl, user, password) {
	await page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	const username = page.locator('input[name="luci_username"], input#luci_username').first();
	const passwordInput = page.locator('input[name="luci_password"], input#luci_password, input[type="password"]').first();

	if (await username.count()) {
		await username.fill(user);
		if (await passwordInput.count())
			await passwordInput.fill(password);
		const submit = page.locator('button[type="submit"], input[type="submit"], .vwrt-auth-submit').first();
		if (await submit.count())
			await submit.click();
		else
			await page.keyboard.press('Enter');
	}

	await waitForLuCIView(page);
}

async function screenshotLocator(page, selector, file) {
	const locator = page.locator(selector).first();
	if (await locator.count())
		await locator.screenshot({ path: file }).catch(() => {});
}

async function collectSourceSafety() {
	const jsDir = path.join('htdocs', 'luci-static', 'vitrawrt', 'js');
	const cssDir = path.join('htdocs', 'luci-static', 'vitrawrt', 'css');
	const jsFiles = (await fs.readdir(jsDir)).filter((name) => name.endsWith('.js'));
	const cssFiles = (await fs.readdir(cssDir)).filter((name) => name.endsWith('.css'));
	const fakeClickFindings = [];
	const globalTableNormalizeFindings = [];

	for (const file of jsFiles) {
		const source = await fs.readFile(path.join(jsDir, file), 'utf8');
		if (/\.click\s*\(|dispatchEvent|MouseEvent|recoverFirstLoadTabs|initNativeTabsOnce/.test(source))
			fakeClickFindings.push(file);
	}

	for (const file of cssFiles) {
		const source = (await fs.readFile(path.join(cssDir, file), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
		const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
		let match;

		while ((match = rulePattern.exec(source)) !== null) {
			const selector = match[1].trim().replace(/\s+/g, ' ');
			const decls = match[2].trim();
			const pageScoped = selector.includes('body.vwrt-page-');
			const luciTableSelector = /#maincontent|\.cbi|(^|[\s>+~,])table(?=[:.#\[\s>+~,]|$)|\.table/.test(selector);

			if (/table-layout\s*:\s*fixed/i.test(decls) && !pageScoped)
				globalTableNormalizeFindings.push(`${file}: global table-layout fixed [${selector}]`);
			if (/white-space\s*:\s*nowrap/i.test(decls) && luciTableSelector && !pageScoped)
				globalTableNormalizeFindings.push(`${file}: possible global nowrap [${selector}]`);
			if (/(^|[;\s])width\s*:\s*100%/i.test(decls) && /(^|[\s>+~,])table(?=[:.#\[\s>+~,]|$)/.test(selector) && !pageScoped)
				globalTableNormalizeFindings.push(`${file}: global table width [${selector}]`);
		}
	}

	return { fakeClickFindings, globalTableNormalizeFindings };
}

async function collectLoginMetrics(page) {
	return await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
		};
		const parseRgb = (value) => {
			const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
			return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null;
		};
		const card = document.querySelector('.vwrt-auth-card');
		const logo = document.querySelector('.vwrt-auth-logo, .vwrt-auth-brand img');
		const submit = document.querySelector('.vwrt-auth-submit, button[type="submit"], input[type="submit"]');
		const submitStyle = submit ? getComputedStyle(submit) : null;
		const color = submitStyle ? parseRgb(submitStyle.backgroundColor) : null;
		const cardRect = rect(card);
		const logoRect = rect(logo);

		return {
			card: cardRect,
			logo: logoRect,
			logoWidthRatio: cardRect && logoRect ? logoRect.width / cardRect.width : null,
			logoHeightRatio: cardRect && logoRect ? logoRect.height / cardRect.height : null,
			submitBackground: submitStyle ? submitStyle.backgroundColor : '',
			submitIsGreen: color ? color.g > color.r * 1.18 && color.g > color.b * 1.18 : false,
			usernamePresent: Boolean(document.querySelector('input[name="luci_username"]')),
			passwordPresent: Boolean(document.querySelector('input[name="luci_password"], input[type="password"]')),
			formAction: document.querySelector('.vwrt-auth-form')?.getAttribute('action') || '',
			hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 12
		};
	});
}

async function collectPageMetrics(page) {
	return await page.evaluate(() => {
		const rect = (node) => {
			if (!node)
				return null;
			const r = node.getBoundingClientRect();
			return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
		};
		const visible = (node) => {
			const style = getComputedStyle(node);
			const r = node.getBoundingClientRect();
			return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0 && r.width > 0 && r.height > 0;
		};
		const main = document.querySelector('#maincontent');
		const sidebar = document.querySelector('#vwrt-sidebar');
		const topGroups = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu > .vwrt-menu.l1 > li'));
		const icons = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu .vwrt-menu-icon'))
			.map((node) => {
				const classes = Array.from(node.classList).filter((cls) => cls.startsWith('vwrt-icon-'));
				const link = node.closest('a');
				return {
					icon: classes.join(' '),
					text: link ? link.textContent.trim().replace(/\s+/g, ' ') : '',
					color: getComputedStyle(node).color
				};
			});
		const stretchedButtons = Array.from(document.querySelectorAll('#maincontent .btn, #maincontent .cbi-button, #maincontent button'))
			.filter(visible)
			.filter((node) => {
				const r = node.getBoundingClientRect();
				const parent = node.parentElement ? node.parentElement.getBoundingClientRect() : null;
				return parent && parent.width > 180 && r.width > Math.min(180, parent.width * 0.88);
			})
			.slice(0, 12)
			.map((node) => ({ text: node.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), rect: rect(node) }));
		return {
			bodyClasses: document.body.className,
			vitrawrt: document.documentElement.dataset.vitrawrt || '',
			theme: document.documentElement.getAttribute('data-theme') || '',
			main: rect(main),
			sidebar: rect(sidebar),
			hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 24,
			sidebarExpandedGroups: topGroups.filter((node) => node.classList.contains('expanded') || node.classList.contains('active') || node.classList.contains('selected')).length,
			sidebarIconCount: icons.length,
			sidebarIcons: icons.slice(0, 24),
			stretchedButtons
		};
	});
}

async function captureLogin(playwright, baseUrl, outputDir, mode, viewportName, viewport, args, report) {
	const browser = await launchBrowser(playwright, args);
	const page = await newPage(browser, viewport, mode);
	const name = `login-${mode}-${viewportName}`;

	await page.goto(`${baseUrl}/cgi-bin/luci/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
	await page.waitForTimeout(1100);
	const screenshot = path.join(outputDir, `${name}.png`);
	await page.screenshot({ path: screenshot, fullPage: true });
	const metrics = await collectLoginMetrics(page);

	report.login.push({ mode, viewportName, viewport, screenshot, metrics });
	await browser.close();
}

async function captureAdminPage(playwright, baseUrl, outputDir, mode, pageDef, args, report) {
	const browser = await launchBrowser(playwright, args);
	const page = await newPage(browser, { width: 1920, height: 1080 }, mode);
	await login(page, baseUrl, args.luciUser, args.luciPassword);

	let target = `${baseUrl}${pageDef.path}`;
	if (pageDef.kind === 'network-share') {
		await page.goto(`${baseUrl}/cgi-bin/luci/admin/status/overview`, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await waitForLuCIView(page);
		const link = await page.evaluate(() => {
			const links = Array.from(document.querySelectorAll('#vitrawrt-sidebar-menu a'));
			const found = links.find((node) => /samba|ksmbd|nfs|share|共享|nas/i.test(`${node.textContent} ${node.getAttribute('href') || ''}`));
			return found ? found.getAttribute('href') : '';
		}).catch(() => '');
		if (!link) {
			report.pages.push({ mode, page: pageDef.name, skipped: true, reason: 'network share link not found' });
			await browser.close();
			return;
		}
		target = link.startsWith('http') ? link : `${baseUrl}${link}`;
	}

	const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
	await waitForLuCIView(page);
	const status = response ? response.status() : 0;
	const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 240)).catch(() => '');
	const notFound = status >= 400 || /not found|invalid url path|404/i.test(bodyText);

	if (notFound) {
		report.pages.push({ mode, page: pageDef.name, path: pageDef.path, status, skipped: true, reason: 'not found' });
		await browser.close();
		return;
	}

	const name = `${mode}-${safeName(pageDef.name)}`;
	const screenshot = path.join(outputDir, `${name}.png`);
	await page.screenshot({ path: screenshot, fullPage: true });

	if (pageDef.name === 'status-overview') {
		await screenshotLocator(page, '#vwrt-sidebar', path.join(outputDir, `${mode}-sidebar.png`));
		await screenshotLocator(page, '#vitrawrt-sidebar-menu', path.join(outputDir, `${mode}-sidebar-menu-icons.png`));
	}

	const metrics = await collectPageMetrics(page);

	if (pageDef.name === 'packages') {
		metrics.packageButtons = await page.evaluate(() => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
			};
			return Array.from(document.querySelectorAll('#maincontent .td.cbi-section-actions > .btn, #maincontent .td.cbi-section-actions > .cbi-button'))
				.filter(visible)
				.slice(0, 12)
				.map((node) => {
					const rect = node.getBoundingClientRect();
					const cell = node.closest('td, .td')?.getBoundingClientRect();
					return { text: node.textContent.trim(), width: Math.round(rect.width), cellWidth: cell ? Math.round(cell.width) : null };
				});
		}).catch(() => []);
	}

	if (pageDef.name === 'vnstat2') {
		metrics.vnstat2 = await page.evaluate(() => {
			const visible = (node) => {
				const style = getComputedStyle(node);
				const rect = node.getBoundingClientRect();
				return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') > 0 && rect.width > 0 && rect.height > 0;
			};
			const graphMenu = Array.from(document.querySelectorAll('#maincontent .tabs, #maincontent .cbi-tabmenu, #tabmenu'))
				.find((menu) => /summary|top|5 minute|hourly|daily|monthly|yearly|摘要|顶部|每小时|每天|每月|按年/i.test(menu.textContent || ''));
			const menuRect = graphMenu ? graphMenu.getBoundingClientRect() : null;
			const images = Array.from(document.querySelectorAll('#maincontent img, #maincontent canvas, #maincontent svg'))
				.filter((node) => {
					const panel = node.closest('.cbi-section[data-tab], .tab-pane, .tab-content > *, [role="tabpanel"]');
					const rect = node.getBoundingClientRect();
					return visible(node) && (!panel || visible(panel)) && rect.width >= 80 && rect.height >= 50;
				})
				.map((node) => {
					const rect = node.getBoundingClientRect();
					return { y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), right: Math.round(rect.right) };
				})
				.sort((a, b) => a.y - b.y);
			return {
				gap: menuRect && images[0] ? Math.round(images[0].y - menuRect.bottom) : null,
				visibleImageCount: images.length,
				firstImage: images[0] || null
			};
		}).catch(() => null);
	}

	report.pages.push({ mode, page: pageDef.name, path: pageDef.path, status, screenshot, metrics });
	await browser.close();
}

async function writeMarkdown(report, outputDir) {
	const sidebarPages = report.pages.filter((item) => !item.skipped && item.page === 'status-overview');
	const lines = [
		'# Visual Identity 1.11 Audit',
		'',
		`Generated: ${new Date().toISOString()}`,
		`Output: ${outputDir}`,
		'',
		'## Sidebar',
		...sidebarPages.map((item) => [
			`- ${item.mode} sidebar: ${path.join(outputDir, `${item.mode}-sidebar.png`)}`,
			`  - menu icon screenshot: ${path.join(outputDir, `${item.mode}-sidebar-menu-icons.png`)}`,
			`  - icon count: ${item.metrics.sidebarIconCount}`,
			`  - expanded groups: ${item.metrics.sidebarExpandedGroups}`,
			`  - icon samples: ${JSON.stringify(item.metrics.sidebarIcons.slice(0, 10))}`
		].join('\n')),
		'',
		'## Login',
		...report.login.map((item) => [
			`- ${item.mode} ${item.viewportName}: ${item.screenshot}`,
			`  - logo/card width ratio: ${item.metrics.logoWidthRatio === null ? 'n/a' : item.metrics.logoWidthRatio.toFixed(3)}`,
			`  - logo/card height ratio: ${item.metrics.logoHeightRatio === null ? 'n/a' : item.metrics.logoHeightRatio.toFixed(3)}`,
			`  - submit background: ${item.metrics.submitBackground}`,
			`  - submit is green: ${item.metrics.submitIsGreen}`,
			`  - horizontal overflow: ${item.metrics.hasHorizontalOverflow}`
		].join('\n')),
		'',
		'## Admin Pages',
		...report.pages.map((item) => {
			if (item.skipped)
				return `- ${item.mode} ${item.page}: skipped (${item.reason})`;
			return [
				`- ${item.mode} ${item.page}: ${item.screenshot}`,
				`  - horizontal overflow: ${item.metrics.hasHorizontalOverflow}`,
				`  - sidebar expanded groups: ${item.metrics.sidebarExpandedGroups}`,
				`  - stretched button samples: ${item.metrics.stretchedButtons.length}`,
				item.page === 'packages' ? `  - package buttons: ${JSON.stringify(item.metrics.packageButtons)}` : '',
				item.page === 'vnstat2' ? `  - vnStat2: ${JSON.stringify(item.metrics.vnstat2)}` : ''
			].filter(Boolean).join('\n');
		}),
		'',
		'## Safety',
		`- fake click findings in theme JS: ${report.sourceSafety.fakeClickFindings.length}`,
		`- global table normalize findings: ${report.sourceSafety.globalTableNormalizeFindings.length}`,
		'',
		'Stage 1.11 upgrades visual identity only. It does not implement dashboard, rpcd, service data, or fake tab recovery.'
	];

	await fs.writeFile(path.join('docs', 'VISUAL_IDENTITY_1_11.md'), `${lines.join('\n')}\n`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const playwright = await loadPlaywright();
	const baseUrl = normalizeHost(args.host);
	const outputDir = args.outputDir || path.join('audit-output', 'visual-identity-1.11', stamp());
	const report = {
		baseUrl,
		outputDir,
		startedAt: new Date().toISOString(),
		login: [],
		pages: [],
		sourceSafety: null
	};

	await ensureDir(outputDir);

	const adminPages = [
		{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
		{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' },
		{ name: 'packages', path: '/cgi-bin/luci/admin/system/package-manager' },
		{ name: 'startup', path: '/cgi-bin/luci/admin/system/startup' },
		{ name: 'processes', path: '/cgi-bin/luci/admin/status/processes' },
		{ name: 'syslog', path: '/cgi-bin/luci/admin/status/logs/syslog' },
		{ name: 'vnstat2', path: '/cgi-bin/luci/admin/status/vnstat2' },
		{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network' },
		{ name: 'network-share', path: '', kind: 'network-share' }
	];

	for (const mode of ['light', 'dark']) {
		await captureLogin(playwright, baseUrl, outputDir, mode, 'desktop', { width: 1920, height: 1080 }, args, report);
		await captureLogin(playwright, baseUrl, outputDir, mode, 'tablet', { width: 1512, height: 982 }, args, report);
		await captureLogin(playwright, baseUrl, outputDir, mode, 'mobile', { width: 390, height: 844 }, args, report);

		for (const pageDef of adminPages)
			await captureAdminPage(playwright, baseUrl, outputDir, mode, pageDef, args, report);
	}

	report.sourceSafety = await collectSourceSafety();
	report.finishedAt = new Date().toISOString();
	await writeJson(path.join(outputDir, 'report.json'), report);
	await writeMarkdown(report, outputDir);

	console.log(`Visual identity audit report: ${outputDir}`);
	console.log(`Screenshots: ${report.login.length + report.pages.filter((item) => !item.skipped).length + 4}`);
	console.log(`Theme JS fake-click findings: ${report.sourceSafety.fakeClickFindings.length}`);
	console.log(`Global table normalize findings: ${report.sourceSafety.globalTableNormalizeFindings.length}`);
	console.log('Markdown: docs/VISUAL_IDENTITY_1_11.md');
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
