import puppeteer from 'puppeteer';
import fs from 'fs';

async function auditDOM(url, name) {
    console.log(`Auditing ${url}...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1024 });

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });
    } catch (e) {
        // Assume login page, try to login
        await page.goto('http://10.10.10.148/cgi-bin/luci', { waitUntil: 'networkidle0' });
        try {
            await page.type('.cbi-input-user', 'root');
            await page.type('.cbi-input-password', 'password'); // Adjust if needed
            await page.click('.cbi-button-apply');
            await page.waitForNavigation({ waitUntil: 'networkidle0' });
            await page.goto(url, { waitUntil: 'networkidle0' });
        } catch (err) {}
    }

    const data = await page.evaluate(() => {
        const rows = document.querySelectorAll('.cbi-value');
        const results = [];
        
        // Pick up to 5 representative rows
        for (let i = 0; i < Math.min(5, rows.length); i++) {
            const row = rows[i];
            const title = row.querySelector('.cbi-value-title');
            const field = row.querySelector('.cbi-value-field');
            const desc = row.querySelector('.cbi-value-description');
            const inputs = row.querySelectorAll('input, select, .cbi-dropdown');

            const getComputed = (el) => {
                if (!el) return null;
                const style = window.getComputedStyle(el);
                return {
                    display: style.display,
                    alignItems: style.alignItems,
                    paddingTop: style.paddingTop,
                    marginTop: style.marginTop,
                    height: style.height,
                    lineHeight: style.lineHeight,
                    boxSizing: style.boxSizing
                };
            };

            const rects = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { top: r.top, height: r.height };
            };

            const inputData = Array.from(inputs).map(input => ({
                tag: input.tagName,
                type: input.type || input.className,
                computed: getComputed(input),
                rect: rects(input)
            }));

            results.push({
                index: i,
                html: row.outerHTML.replace(/\s+/g, ' ').substring(0, 300) + '...',
                row: { computed: getComputed(row), rect: rects(row) },
                title: { computed: getComputed(title), rect: rects(title) },
                field: { computed: getComputed(field), rect: rects(field) },
                desc: { computed: getComputed(desc), rect: rects(desc) },
                inputs: inputData
            });
        }
        return results;
    });

    fs.writeFileSync(`audit_dom_${name}.json`, JSON.stringify(data, null, 2));
    console.log(`Saved ${name}`);
    await browser.close();
}

(async () => {
    await auditDOM('http://10.10.10.148/cgi-bin/luci/admin/system/system', 'system');
})();
