#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const selectors = [
	'cbi-map',
	'cbi-section',
	'cbi-section-node',
	'cbi-section-table',
	'ifacebox',
	'ifacebox-head',
	'ifacebox-body',
	'ifacebox-network',
	'network-status-table',
	'tabs',
	'cbi-tabmenu',
	'cbi-tab',
	'cbi-tab-disabled',
	'alert-message',
	'alert',
	'table',
	'tr',
	'td',
	'th',
	'form',
	'cbi-value',
	'cbi-value-title',
	'cbi-value-field'
];

function usage() {
	console.error('Usage: scripts/extract-dom-classes.mjs <html-file> [html-file ...]');
}

function readFiles(files) {
	return files.map((file) => ({
		file,
		name: path.basename(file),
		html: fs.readFileSync(file, 'utf8')
	}));
}

function decodeEntities(value) {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#34;/g, '"')
		.replace(/&#x22;/gi, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#39;/g, "'")
		.replace(/&#x27;/gi, "'")
		.replace(/&amp;/g, '&');
}

function getAttrs(tag) {
	const attrs = {};
	const re = /([:@A-Za-z0-9_.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	let match;

	while ((match = re.exec(tag)) !== null) {
		const key = match[1];
		if (!key || key === tag.split(/\s+/, 1)[0])
			continue;

		attrs[key.toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? '');
	}

	return attrs;
}

function getTagName(tag) {
	const match = tag.match(/^<\s*\/?\s*([A-Za-z0-9:-]+)/);
	return match ? match[1].toLowerCase() : '';
}

function getClassList(attrs) {
	return (attrs.class || '')
		.split(/\s+/)
		.map((item) => item.trim())
		.filter(Boolean);
}

function extractTags(html) {
	const tags = [];
	const re = /<([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*)?>/g;
	let match;

	while ((match = re.exec(html)) !== null) {
		const raw = match[0];
		const tag = getTagName(raw);
		const attrs = getAttrs(raw);
		tags.push({
			raw,
			tag,
			attrs,
			classes: getClassList(attrs),
			index: match.index
		});
	}

	return tags;
}

function classFrequency(docs) {
	const counts = new Map();

	for (const doc of docs) {
		for (const tag of extractTags(doc.html)) {
			for (const cls of tag.classes)
				counts.set(cls, (counts.get(cls) || 0) + 1);
		}
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function summarizeTag(tag) {
	const id = tag.attrs.id ? `#${tag.attrs.id}` : '';
	const cls = tag.classes.length ? `.${tag.classes.join('.')}` : '';
	const name = tag.attrs.name ? ` name="${tag.attrs.name}"` : '';
	const type = tag.attrs.type ? ` type="${tag.attrs.type}"` : '';
	const href = tag.attrs.href ? ` href="${tag.attrs.href}"` : '';
	return `<${tag.tag}${id}${cls}${name}${type}${href}>`;
}

function findNearbySnippet(html, index, radius = 220) {
	const start = Math.max(0, index - radius);
	const end = Math.min(html.length, index + radius);
	return html
		.slice(start, end)
		.replace(/\s+/g, ' ')
		.trim();
}

function structureReport(doc) {
	const tags = extractTags(doc.html);
	const rows = [];

	for (const selector of selectors) {
		const matches = tags.filter((tag) => {
			if (selector === 'table' || selector === 'form')
				return tag.tag === selector || tag.classes.includes(selector);

			return tag.classes.includes(selector);
		});

		rows.push({
			selector,
			count: matches.length,
			examples: matches.slice(0, 8).map((tag) => ({
				tag: summarizeTag(tag),
				snippet: findNearbySnippet(doc.html, tag.index)
			}))
		});
	}

	return rows;
}

function pageElementCounts(doc) {
	const tags = extractTags(doc.html);
	const counts = {
		tables: 0,
		forms: 0,
		inputs: 0,
		selects: 0,
		textareas: 0,
		buttons: 0,
		alerts: 0,
		ifaceboxes: 0,
		tabs: 0
	};

	for (const tag of tags) {
		if (tag.tag === 'table')
			counts.tables++;
		if (tag.tag === 'form')
			counts.forms++;
		if (tag.tag === 'input')
			counts.inputs++;
		if (tag.tag === 'select')
			counts.selects++;
		if (tag.tag === 'textarea')
			counts.textareas++;
		if (tag.tag === 'button')
			counts.buttons++;
		if (tag.classes.includes('alert') || tag.classes.includes('alert-message'))
			counts.alerts++;
		if (tag.classes.includes('ifacebox'))
			counts.ifaceboxes++;
		if (tag.classes.includes('tabs') || tag.classes.includes('cbi-tabmenu'))
			counts.tabs++;
	}

	return counts;
}

function printReport(docs) {
	console.log('# VitraWrt Real Device DOM Class Audit');
	console.log('');
	console.log(`Generated: ${new Date().toISOString()}`);
	console.log('');

	console.log('## Input Files');
	console.log('');
	for (const doc of docs)
		console.log(`- ${doc.file}`);
	console.log('');

	console.log('## Class Frequency');
	console.log('');
	for (const [cls, count] of classFrequency(docs).slice(0, 240))
		console.log(`${String(count).padStart(5, ' ')}  .${cls}`);
	console.log('');

	console.log('## Page Element Counts');
	console.log('');
	for (const doc of docs) {
		const counts = pageElementCounts(doc);
		console.log(`### ${doc.name}`);
		console.log('');
		for (const [key, value] of Object.entries(counts))
			console.log(`- ${key}: ${value}`);
		console.log('');
	}

	console.log('## cbi / ifacebox / tabs / alert / table / form Structure');
	console.log('');
	for (const doc of docs) {
		console.log(`### ${doc.name}`);
		console.log('');

		for (const item of structureReport(doc)) {
			console.log(`#### ${item.selector}: ${item.count}`);

			if (!item.examples.length) {
				console.log('');
				continue;
			}

			for (const example of item.examples) {
				console.log(`- ${example.tag}`);
				console.log(`  ${example.snippet}`);
			}

			console.log('');
		}
	}
}

const files = process.argv.slice(2);

if (!files.length) {
	usage();
	process.exit(1);
}

try {
	printReport(readFiles(files));
}
catch (err) {
	console.error(`extract-dom-classes: ${err.message}`);
	process.exit(1);
}
