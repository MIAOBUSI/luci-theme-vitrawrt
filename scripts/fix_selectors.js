const fs = require('fs');
const path = '/Users/nyakabeusu/Documents/GitHub/vitrawrt/luci-theme-vitrawrt/htdocs/luci-static/vitrawrt/css/luci-components-visual.css';
let css = fs.readFileSync(path, 'utf8');

css = css.replace(/\.cbi-progressbar(?!\.vw-progressbar-upgraded|:not)/g, '.cbi-progressbar:not(.vw-progressbar-upgraded)');
css = css.replace(/\.progressbar(?!\.vw-progressbar-upgraded|:not)/g, '.progressbar:not(.vw-progressbar-upgraded)');
css = css.replace(/\.progress (?!\.vw-progressbar-upgraded|:not)/g, '.progress:not(.vw-progressbar-upgraded) ');
css = css.replace(/\.progress,(?!\.vw-progressbar-upgraded|:not)/g, '.progress:not(.vw-progressbar-upgraded),');
css = css.replace(/progress(?!\.vw-progressbar-upgraded|:not|bar|-|:)/g, 'progress:not(.vw-progressbar-upgraded)');

fs.writeFileSync(path, css);
console.log('Fixed selectors in luci-components-visual.css');
