const fs = require('fs');

let css = fs.readFileSync('htdocs/luci-static/vitrawrt/css/luci-components-visual.css', 'utf8');

// Replace the container style
css = css.replace(/#maincontent \.cbi-progressbar\.vw-progressbar-upgraded \{[\s\S]*?\}/,
`#maincontent .cbi-progressbar.vw-progressbar-upgraded {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
}`);

// Add Track styling
if (!css.includes('.vw-pb-track')) {
	css = css.replace(/\/\* Colored fill bar: gradient colors \*\//,
`/* Track styling */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-track {
    background: color-mix(in srgb, var(--vw-text) 8%, transparent) !important;
    border-radius: 99px !important;
}

/* Colored fill bar: gradient colors */`);
}

// Update Text label
css = css.replace(/\/\* Text label: font style \*\/[\s\S]*?\/\* Percentage badge: font style \*\//,
`/* Text label: font style */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-text {
    font-size: 13px !important;
    font-weight: 500 !important;
    color: var(--vw-text-main) !important;
    line-height: 1 !important;
}

/* Percentage badge: font style */`);

// Update Badge style (it needs to look like the pill)
css = css.replace(/\/\* Percentage badge: font style \*\/[\s\S]*?\/\* Hide the badge for primary\/success bars \— moved to layout-exceptions\.css \*\//,
`/* Percentage badge: font style */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-badge {
    font-size: 12px !important;
    font-weight: 600 !important;
    color: var(--vw-primary) !important;
    background: color-mix(in srgb, var(--vw-primary) 12%, transparent) !important;
    padding: 3px 8px !important;
    border-radius: 99px !important;
    line-height: 1 !important;
}

#maincontent .cbi-progressbar.vw-progressbar-upgraded.vw-pb-success .vw-pb-badge {
    color: var(--vw-success) !important;
    background: color-mix(in srgb, var(--vw-success) 12%, transparent) !important;
}

/* Hide the badge for primary/success bars — moved to layout-exceptions.css */`);

fs.writeFileSync('htdocs/luci-static/vitrawrt/css/luci-components-visual.css', css);
console.log("Updated visual CSS");
