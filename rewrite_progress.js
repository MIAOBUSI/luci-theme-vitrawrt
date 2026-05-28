const fs = require('fs');

// 1. boot.js
let bootJs = fs.readFileSync('htdocs/luci-static/vitrawrt/js/boot.js', 'utf8');
bootJs = bootJs.replace(/var fill = document\.createElement\('div'\);[\s\S]*?var track = document\.createElement\('div'\);\s*track\.className = 'vw-pb-track';\s*bar\.appendChild\(track\);/m, 
`var header = document.createElement('div');
			header.className = 'vw-pb-header';
			var txt = document.createElement('span');
			txt.className = 'vw-pb-text';
			var badge = document.createElement('span');
			badge.className = 'vw-pb-badge';
			header.appendChild(txt);
			header.appendChild(badge);
			bar.appendChild(header);
			
			var track = document.createElement('div');
			track.className = 'vw-pb-track';
			bar.appendChild(track);
			
			var fill = document.createElement('div');
			fill.className = 'vw-pb-fill';
			fill.style.width = initialWidth;
			track.appendChild(fill);`);
fs.writeFileSync('htdocs/luci-static/vitrawrt/js/boot.js', bootJs);

// 2. luci-layout-exceptions.css
let layoutCss = fs.readFileSync('htdocs/luci-static/vitrawrt/css/luci-layout-exceptions.css', 'utf8');
layoutCss = layoutCss.replace(/\/\* Container: positioning context, pill shape, fixed height \*\/[\s\S]*?\/\* Fallback un-upgraded bars/m,
`/* Container: vertical flex layout */
#maincontent .cbi-progressbar.vw-progressbar-upgraded {
	position: relative !important;
	display: flex !important;
	flex-direction: column !important;
	justify-content: center !important;
	padding: 4px 0 !important;
	margin-bottom: 4px !important;
	min-height: 44px !important;
	overflow: visible !important;
	border: none !important;
	background: transparent !important;
}

/* Hidden dummy — LuCI core JS writes width/text here; we mirror it to .vw-pb-fill */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-dummy {
	display: none !important;
	visibility: hidden !important;
	position: absolute !important;
}

/* Header row: text + badge above the track */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-header {
	display: flex !important;
	align-items: center !important;
	justify-content: space-between !important;
	width: 100% !important;
	margin-bottom: 6px !important;
}

/* Text & Badge layout */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-text {
	overflow: hidden !important;
	text-overflow: ellipsis !important;
	flex: 1 1 0 !important;
	min-width: 0 !important;
	white-space: nowrap !important;
}
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-badge {
	flex-shrink: 0 !important;
	margin-left: 8px !important;
}

/* The track (grey background) */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-track {
	position: relative !important;
	width: 100% !important;
	height: 10px !important;
	display: block !important;
	overflow: hidden !important;
}

/* The actual colored fill — inside the track */
#maincontent .cbi-progressbar.vw-progressbar-upgraded .vw-pb-fill {
	position: absolute !important;
	top: 0 !important;
	left: 0 !important;
	bottom: 0 !important;
	height: 100% !important;
	max-width: 100% !important;
}

/* Fallback un-upgraded bars`);
fs.writeFileSync('htdocs/luci-static/vitrawrt/css/luci-layout-exceptions.css', layoutCss);

console.log("Updated boot.js and layout CSS");
