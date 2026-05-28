const fs = require('fs');
let bootJs = fs.readFileSync('htdocs/luci-static/vitrawrt/js/boot.js', 'utf8');
bootJs = bootJs.replace(/txt\.className = 'vw-pb-text';/, "txt.className = 'vw-pb-text';\n\t\t\ttxt.style.whiteSpace = 'nowrap';");
bootJs = bootJs.replace(/badge\.className = 'vw-pb-badge';/, "badge.className = 'vw-pb-badge';\n\t\t\tbadge.style.whiteSpace = 'nowrap';");
fs.writeFileSync('htdocs/luci-static/vitrawrt/js/boot.js', bootJs);
console.log("Added nowrap to boot.js");
