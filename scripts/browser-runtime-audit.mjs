#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const pages = [
	{ name: 'login', path: '/cgi-bin/luci/' },
	{ name: 'status-overview', path: '/cgi-bin/luci/admin/status/overview' },
	{ name: 'system-system', path: '/cgi-bin/luci/admin/system/system' },
	{ name: 'status-nftables', path: '/cgi-bin/luci/admin/status/nftables' },
	{ name: 'network-network', path: '/cgi-bin/luci/admin/network/network' },
	{ name: 'network-firewall', path: '/cgi-bin/luci/admin/network/firewall' }
];

function usage() {
	console.log(`Usage: node scripts/browser-runtime-audit.mjs [options]

Options:
  --host <ip>           Target host. Default: 10.10.10.148
  --luci-user <user>    LuCI login user. Default: root
  --luci-password <pw>  LuCI password. Default: empty
  --output-dir <dir>    Output directory. Default: audit-output/browser-runtime/<timestamp>
  --headed              Run headed browser
  -h, --help            Show help`);
}

function parseArgs(argv) {
	const args = {
		host: '10.10.10.148',
		luciUser: 'root',
		luciPassword: '',
		outputDir: '',
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

function fail(message) {
	console.error(`browser-runtime-audit: ${message}`);
	process.exit(1);
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
			console.error('Playwright is not available to this Node.js runtime.');
			console.error('Install it with: npm install --prefix /tmp/vitrawrt-pw playwright');
			console.error('Then run: PLAYWRIGHT_BROWSERS_PATH=/tmp/vitrawrt-pw-browsers node scripts/browser-runtime-audit.mjs --host 10.10.10.148');
			throw err;
		}
	}
}

function stamp() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, '0');
	return [
		d.getFullYear(),
		pad(d.getMonth() + 1),
		pad(d.getDate()),
		'-',
		pad(d.getHours()),
		pad(d.getMinutes()),
		pad(d.getSeconds())
	].join('');
}

async function ensureDirs(root) {
	for (const dir of ['html', 'json', 'screenshots'])
		await fs.mkdir(path.join(root, dir), { recursive: true });
}

async function writeJson(file, data) {
	await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function waitForLuCIView(page) {
	await page.waitForLoadState('domcontentloaded').catch(() => {});
	await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

	await page.waitForFunction(() => {
		const view = document.querySelector('#view');

		if (!view)
			return true;

		const spinning = view.querySelector('.spinning');
		const onlySpinning = spinning && view.children.length === 1;

		return !onlySpinning;
	}, null, { timeout: 15000 }).catch(() => {});

	await page.waitForTimeout(3500);
}

async function login(page, baseUrl, user, password) {
	await page.goto(`${baseUrl}/cgi-bin/luci/`, {
		waitUntil: 'domcontentloaded',
		timeout: 30000
	});

	const username = page.locator('input[name="luci_username"], input#luci_username').first();
	const passwordInput = page.locator('input[name="luci_password"], input#luci_password, input[type="password"]').first();

	if (await username.count()) {
		await username.fill(user);

		if (await passwordInput.count())
			await passwordInput.fill(password);

		const submit = page.locator('button[type="submit"], input[type="submit"], .cbi-button-apply, .btn').first();

		if (await submit.count())
			await submit.click();
		else
			await page.keyboard.press('Enter');

		await page.waitForLoadState('domcontentloaded').catch(() => {});
		await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
	}
}

function pageAuditScript() {
	const interesting = [
		'.cbi-map',
		'.cbi-section',
		'.cbi-section-node',
		'.cbi-section-table',
		'.cbi-tabmenu',
		'.cbi-tab',
		'.cbi-tab-disabled',
		'.tabs',
		'.ifacebox',
		'.ifacebox-head',
		'.ifacebox-body',
		'.ifacebox-network',
		'.network-status-table',
		'.alert-message',
		'.alert',
		'table',
		'.table',
		'tr',
		'td',
		'th',
		'.tr',
		'.td',
		'form',
		'input',
		'select',
		'textarea',
		'button',
		'.btn',
		'progress',
		'.progress'
	];

	function classFrequency() {
		const counts = {};

		document.querySelectorAll('[class]').forEach((node) => {
			node.classList.forEach((cls) => {
				counts[cls] = (counts[cls] || 0) + 1;
			});
		});

		return Object.entries(counts)
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.map(([name, count]) => ({ name, count }));
	}

	function cssPath(node) {
		if (!node || node.nodeType !== 1)
			return '';

		const parts = [];
		let current = node;

		while (current && current.nodeType === 1 && parts.length < 7) {
			let part = current.tagName.toLowerCase();

			if (current.id)
				part += `#${current.id}`;

			if (current.classList.length)
				part += `.${Array.from(current.classList).slice(0, 5).join('.')}`;

			parts.unshift(part);
			current = current.parentElement;
		}

		return parts.join(' > ');
	}

	function rect(node) {
		const r = node.getBoundingClientRect();
		return {
			x: Math.round(r.x),
			y: Math.round(r.y),
			width: Math.round(r.width),
			height: Math.round(r.height)
		};
	}

	function styleSummary(node) {
		const s = getComputedStyle(node);
		return {
			display: s.display,
			position: s.position,
			pointerEvents: s.pointerEvents,
			zIndex: s.zIndex,
			overflow: s.overflow,
			gridTemplateColumns: s.gridTemplateColumns,
			flexDirection: s.flexDirection,
			alignItems: s.alignItems,
			justifyContent: s.justifyContent
		};
	}

	function summarizeNode(node) {
		const r = node.getBoundingClientRect();
		const centerX = r.left + r.width / 2;
		const centerY = r.top + r.height / 2;
		const top = document.elementFromPoint(centerX, centerY);

		return {
			path: cssPath(node),
			tag: node.tagName.toLowerCase(),
			id: node.id || '',
			className: node.className || '',
			text: (node.innerText || node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 260),
			rect: rect(node),
			style: styleSummary(node),
			topElementAtCenter: top ? cssPath(top) : '',
			centerHitSelfOrChild: !!(top && (top === node || node.contains(top)))
		};
	}

	function structure(selector) {
		return Array.from(document.querySelectorAll(selector))
			.slice(0, 40)
			.map(summarizeNode);
	}

	function elementCounts() {
		const counts = {};

		for (const selector of interesting)
			counts[selector] = document.querySelectorAll(selector).length;

		return counts;
	}

	return {
		url: location.href,
		title: document.title,
		htmlClasses: Array.from(document.documentElement.classList),
		htmlDataset: { ...document.documentElement.dataset },
		bodyClasses: Array.from(document.body.classList),
		bodyDataset: { ...document.body.dataset },
		viewText: (document.querySelector('#view')?.innerText || '').trim().slice(0, 500),
		classFrequency: classFrequency(),
		counts: elementCounts(),
		structure: Object.fromEntries(interesting.map((selector) => [selector, structure(selector)]))
	};
}

async function auditPage(page, baseUrl, info, outDir) {
	const url = `${baseUrl}${info.path}`;

	await page.goto(url, {
		waitUntil: 'domcontentloaded',
		timeout: 45000
	});

	await waitForLuCIView(page);

	const html = await page.evaluate(() => document.documentElement.outerHTML);
	const audit = await page.evaluate(pageAuditScript);

	await fs.writeFile(path.join(outDir, 'html', `${info.name}.html`), html);
	await writeJson(path.join(outDir, 'json', `${info.name}.json`), audit);

	await page.screenshot({
		path: path.join(outDir, 'screenshots', `${info.name}-full.png`),
		fullPage: true
	}).catch(() => {});

	await page.locator('#vwrt-sidebar').screenshot({
		path: path.join(outDir, 'screenshots', `${info.name}-sidebar.png`)
	}).catch(() => {});

	await page.locator('#maincontent').screenshot({
		path: path.join(outDir, 'screenshots', `${info.name}-maincontent.png`)
	}).catch(() => {});

	return audit;
}

async function auditTabs(page, baseUrl, outDir) {
	const events = [];
	const consoleMessages = [];

	page.on('console', (msg) => {
		consoleMessages.push({
			type: msg.type(),
			text: msg.text()
		});
	});

	page.on('pageerror', (err) => {
		consoleMessages.push({
			type: 'pageerror',
			text: err.message
		});
	});

	await page.goto(`${baseUrl}/cgi-bin/luci/admin/system/system`, {
		waitUntil: 'domcontentloaded',
		timeout: 45000
	});

	await waitForLuCIView(page);

	const beforeHtml = await page.evaluate(() => document.documentElement.outerHTML);
	await fs.writeFile(path.join(outDir, 'html', 'system-tabs-before.html'), beforeHtml);

	const tabs = await page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #view .cbi-tabmenu a, #view .tabs a').evaluateAll((nodes) => {
		function cssPath(node) {
			const parts = [];
			let current = node;

			while (current && current.nodeType === 1 && parts.length < 6) {
				let part = current.tagName.toLowerCase();

				if (current.id)
					part += `#${current.id}`;

				if (current.classList.length)
					part += `.${Array.from(current.classList).slice(0, 4).join('.')}`;

				parts.unshift(part);
				current = current.parentElement;
			}

			return parts.join(' > ');
		}

		return nodes.map((node, index) => {
			const rect = node.getBoundingClientRect();
			const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
			const style = getComputedStyle(node);
			const parentStyle = node.parentElement ? getComputedStyle(node.parentElement) : null;

			return {
				index,
				text: (node.textContent || '').trim().replace(/\s+/g, ' '),
				href: node.getAttribute('href') || '',
				path: cssPath(node),
				parentClass: node.parentElement?.className || '',
				rect: {
					x: Math.round(rect.x),
					y: Math.round(rect.y),
					width: Math.round(rect.width),
					height: Math.round(rect.height)
				},
				pointerEvents: style.pointerEvents,
				parentPointerEvents: parentStyle?.pointerEvents || '',
				topElementAtCenter: top ? cssPath(top) : '',
				centerHitSelfOrChild: !!(top && (top === node || node.contains(top)))
			};
		});
	}).catch(() => []);

	for (let i = 0; i < tabs.length; i++) {
		const locator = page.locator('#maincontent .cbi-tabmenu a, #maincontent .tabs a, #view .cbi-tabmenu a, #view .tabs a').nth(i);
		const before = await page.evaluate(() => ({
			url: location.href,
			hash: location.hash,
			active: Array.from(document.querySelectorAll('.cbi-tab, .tabs .active, .cbi-tabmenu .active')).map((node) => ({
				tag: node.tagName.toLowerCase(),
				className: node.className,
				text: (node.textContent || '').trim().replace(/\s+/g, ' ')
			}))
		}));

		let clickError = '';

		try {
			await locator.click({ timeout: 5000 });
			await page.waitForTimeout(900);
		}
		catch (err) {
			clickError = err.message;
		}

		const after = await page.evaluate(() => ({
			url: location.href,
			hash: location.hash,
			active: Array.from(document.querySelectorAll('.cbi-tab, .tabs .active, .cbi-tabmenu .active')).map((node) => ({
				tag: node.tagName.toLowerCase(),
				className: node.className,
				text: (node.textContent || '').trim().replace(/\s+/g, ' ')
			}))
		}));

		events.push({
			tab: tabs[i],
			before,
			after,
			activeChanged: JSON.stringify(before.active) !== JSON.stringify(after.active),
			urlChanged: before.url !== after.url || before.hash !== after.hash,
			clickError
		});
	}

	const afterHtml = await page.evaluate(() => document.documentElement.outerHTML);
	await fs.writeFile(path.join(outDir, 'html', 'system-tabs-after.html'), afterHtml);

	const result = {
		tabs,
		events,
		consoleMessages
	};

	await writeJson(path.join(outDir, 'json', 'system-tabs-click-test.json'), result);

	return result;
}

function renderReport(pageAudits, tabAudit) {
	const lines = [];

	lines.push('# VitraWrt Browser Runtime DOM Audit');
	lines.push('');
	lines.push(`Generated: ${new Date().toISOString()}`);
	lines.push('');

	for (const item of pageAudits) {
		lines.push(`## ${item.name}`);
		lines.push('');
		lines.push(`- URL: ${item.audit.url}`);
		lines.push(`- Title: ${item.audit.title}`);
		lines.push(`- html classes: ${item.audit.htmlClasses.join(' ') || '(none)'}`);
		lines.push(`- body classes: ${item.audit.bodyClasses.join(' ') || '(none)'}`);
		lines.push('');
		lines.push('### Counts');
		lines.push('');

		for (const [key, value] of Object.entries(item.audit.counts))
			lines.push(`- \`${key}\`: ${value}`);

		lines.push('');
		lines.push('### Top Classes');
		lines.push('');

		for (const cls of item.audit.classFrequency.slice(0, 80))
			lines.push(`- .${cls.name}: ${cls.count}`);

		lines.push('');
		lines.push('### Key Structures');
		lines.push('');

		for (const selector of ['.cbi-map', '.cbi-section', '.cbi-tabmenu', '.tabs', '.ifacebox', '.network-status-table', 'table', '.table', 'form', 'input', 'select', 'button', '.alert-message', '.alert']) {
			const entries = item.audit.structure[selector] || [];
			lines.push(`#### ${selector}: ${entries.length}`);

			for (const entry of entries.slice(0, 8))
				lines.push(`- ${entry.path} | ${entry.rect.width}x${entry.rect.height} | display=${entry.style.display} | pe=${entry.style.pointerEvents} | text="${entry.text}"`);

			lines.push('');
		}
	}

	lines.push('## System Tabs Click Test');
	lines.push('');
	lines.push(`- tabs found: ${tabAudit.tabs.length}`);
	lines.push(`- console/page errors: ${tabAudit.consoleMessages.length}`);
	lines.push('');

	for (const event of tabAudit.events) {
		lines.push(`### ${event.tab.text || `(tab ${event.tab.index})`}`);
		lines.push(`- pointer-events: ${event.tab.pointerEvents}; parent: ${event.tab.parentPointerEvents}`);
		lines.push(`- center hit self/child: ${event.tab.centerHitSelfOrChild}`);
		lines.push(`- top element: ${event.tab.topElementAtCenter}`);
		lines.push(`- active changed: ${event.activeChanged}`);
		lines.push(`- URL/hash changed: ${event.urlChanged}`);
		lines.push(`- click error: ${event.clickError || '(none)'}`);
		lines.push(`- before active: ${event.before.active.map((item) => item.text).join(' | ') || '(none)'}`);
		lines.push(`- after active: ${event.after.active.map((item) => item.text).join(' | ') || '(none)'}`);
		lines.push('');
	}

	if (tabAudit.consoleMessages.length) {
		lines.push('### Console Messages');
		lines.push('');

		for (const msg of tabAudit.consoleMessages)
			lines.push(`- [${msg.type}] ${msg.text}`);
	}

	return `${lines.join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
const baseUrl = `http://${args.host}`;
const outDir = args.outputDir || path.resolve('audit-output', 'browser-runtime', stamp());

await ensureDirs(outDir);

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({
	headless: !args.headed,
	args: [
		'--no-sandbox',
		'--disable-dev-shm-usage',
		'--disable-gpu',
		'--single-process'
	]
});

const context = await browser.newContext({
	viewport: { width: 1440, height: 960 },
	deviceScaleFactor: 1,
	ignoreHTTPSErrors: true
});

const page = await context.newPage();
const pageAudits = [];

try {
	await login(page, baseUrl, args.luciUser, args.luciPassword);

	for (const info of pages) {
		const audit = await auditPage(page, baseUrl, info, outDir);
		pageAudits.push({ name: info.name, audit });
		console.log(`${info.name}: ${audit.url}`);
	}

	const tabAudit = await auditTabs(page, baseUrl, outDir);
	const report = renderReport(pageAudits, tabAudit);
	await fs.writeFile(path.join(outDir, 'runtime-report.md'), report);

	console.log(`\nOutput: ${outDir}`);
	console.log(`Report: ${path.join(outDir, 'runtime-report.md')}`);
}
finally {
	await browser.close();
}
