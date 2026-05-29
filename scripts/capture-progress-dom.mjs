import process from 'process';
const pwPath = process.env.PLAYWRIGHT_PACKAGE_PATH || '/tmp/vitrawrt-pw/node_modules/playwright/index.mjs';
const playwright = await import(pwPath);
import fs from 'fs';

(async () => {
    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    const host = process.argv[2] || '10.10.10.148';
    const loginUrl = `http://${host}/cgi-bin/luci/`;
    
    console.log(`Logging into ${loginUrl}`);
    await page.goto(loginUrl);
    await page.fill('input[name="luci_username"], input#luci_username', 'root');
    await page.fill('input[name="luci_password"], input#luci_password, input[type="password"]', 'password');
    await page.click('button[type="submit"], input[type="submit"], .vwrt-auth-submit');
    await page.waitForTimeout(3000); 

    const evidence = [];

    const getProgressDOM = async (url, label) => {
        console.log(`Navigating to ${url}`);
        await page.goto(url);
        await page.waitForTimeout(2000); 

        const doms = await page.evaluate(() => {
            const bars = document.querySelectorAll('.cbi-progressbar');
            return Array.from(bars).map(bar => {
                const inner = bar.querySelector('div');
                const computed = window.getComputedStyle(bar);
                const innerComputed = inner ? window.getComputedStyle(inner) : null;
                return {
                    outerHTML: bar.outerHTML,
                    outerStyle: {
                        height: computed.height,
                        background: computed.background,
                        borderRadius: computed.borderRadius,
                        boxShadow: computed.boxShadow
                    },
                    innerInlineWidth: inner ? inner.style.width : null,
                    innerComputedStyle: innerComputed ? {
                        height: innerComputed.height,
                        background: innerComputed.background,
                        borderRadius: innerComputed.borderRadius
                    } : null
                };
            });
        });
        evidence.push(`## ${label}\n\nURL: ${url}\n\n\`\`\`json\n${JSON.stringify(doms, null, 2)}\n\`\`\`\n`);
    };

    await getProgressDOM(`http://${host}/cgi-bin/luci/admin/status/overview`, 'Overview Page');
    await getProgressDOM(`http://${host}/cgi-bin/luci/admin/system/packages`, 'Packages Page');

    fs.writeFileSync('docs/STAGE_1_41C_R3_PROGRESS_DOM_EVIDENCE.md', `# Stage 1.41C-R3 Progress DOM Evidence\n\n${evidence.join('\n')}`);
    console.log('Evidence written to docs/STAGE_1_41C_R3_PROGRESS_DOM_EVIDENCE.md');

    await browser.close();
})();
