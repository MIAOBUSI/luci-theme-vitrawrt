import puppeteer from 'puppeteer';
import fs from 'fs/promises';

const HOST = '10.10.10.148';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(`http://${HOST}/cgi-bin/luci/`);
  
  // Login
  try {
    await page.waitForSelector('input[name="luci_password"]', { timeout: 5000 });
    await page.type('input[name="luci_password"]', 'password');
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation()
    ]);
  } catch (e) {
    console.log("No login required or already logged in.");
  }

  const pagesToVisit = [
    { name: 'System Time Sync', url: `http://${HOST}/cgi-bin/luci/admin/system/system` }
  ];

  let markdown = `# STAGE_1_41B_DROPDOWN_DYNLIST_EVIDENCE\n\n`;

  for (const p of pagesToVisit) {
    await page.goto(p.url);
    await page.waitForSelector('.cbi-dropdown', { timeout: 10000 }).catch(() => {});
    await page.waitForSelector('.cbi-dynlist', { timeout: 10000 }).catch(() => {});

    markdown += `## Page: ${p.name}\n\n`;

    const evidence = await page.evaluate(() => {
      function getStyles(el) {
        if (!el) return null;
        const s = window.getComputedStyle(el);
        return {
          height: s.height,
          background: s.background,
          backgroundColor: s.backgroundColor,
          borderRadius: s.borderRadius,
          display: s.display,
          lineHeight: s.lineHeight,
          padding: s.padding,
          gap: s.gap,
          color: s.color,
          boxShadow: s.boxShadow,
          content: s.content,
          backgroundImage: s.backgroundImage
        };
      }
      
      const res = {};
      
      const nativeSelect = document.querySelector('select');
      if (nativeSelect) {
        res.nativeSelect = {
          html: nativeSelect.outerHTML.substring(0, 150) + '...',
          styles: getStyles(nativeSelect)
        };
      }
      
      const dropdown = document.querySelector('.cbi-dropdown');
      if (dropdown) {
        res.dropdown = {
          html: dropdown.outerHTML.substring(0, 300) + '...',
          styles: getStyles(dropdown),
          ul: getStyles(dropdown.querySelector('ul')),
          spanOpen: getStyles(dropdown.querySelector('span.open')),
          spanMore: getStyles(dropdown.querySelector('span.more'))
        };
      }
      
      const dynlist = document.querySelector('.cbi-dynlist');
      if (dynlist) {
        res.dynlist = {
          html: dynlist.outerHTML.substring(0, 500) + '...',
          item: getStyles(dynlist.querySelector('.cbi-dynlist-item')),
          addRow: getStyles(dynlist.querySelector('.cbi-dynlist-row:last-child')),
          addBtn: getStyles(dynlist.querySelector('.cbi-button-add')),
          removeBtn: getStyles(dynlist.querySelector('.cbi-button-remove'))
        };
      }
      
      return res;
    });

    markdown += "```json\n" + JSON.stringify(evidence, null, 2) + "\n```\n\n";
  }

  await browser.close();
  await fs.mkdir('docs', { recursive: true });
  await fs.writeFile('docs/STAGE_1_41B_DROPDOWN_DYNLIST_EVIDENCE.md', markdown);
  console.log("Evidence collected in docs/STAGE_1_41B_DROPDOWN_DYNLIST_EVIDENCE.md");
}

run().catch(console.error);
