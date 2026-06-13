#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const repositoryRoot = path.resolve(process.argv[2] || '.');
const retainedBridgeFiles = [];
const viteStyleDirectory = 'frontend/src/styles';

function collectReferences(source) {
	return new Set(Array.from(source.matchAll(/var\(\s*(--[\w-]+)/g), (match) => match[1]));
}

function collectDefinitions(source) {
	return new Set(Array.from(source.matchAll(/^\s*(--[\w-]+)\s*:/gm), (match) => match[1]));
}

async function read(relativePath) {
	return fs.readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

async function main() {
	const bridgeSources = await Promise.all(retainedBridgeFiles.map(read));
	const styleEntries = await fs.readdir(path.join(repositoryRoot, viteStyleDirectory), {
		withFileTypes: true
	});
	const viteFiles = styleEntries
		.filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
		.map((entry) => path.join(viteStyleDirectory, entry.name));
	const viteSources = await Promise.all(viteFiles.map(read));

	const references = new Set();
	const definitions = new Set();

	for (const source of bridgeSources) {
		for (const reference of collectReferences(source))
			references.add(reference);
		for (const definition of collectDefinitions(source))
			definitions.add(definition);
	}

	for (const source of viteSources) {
		for (const reference of collectReferences(source))
			references.add(reference);
		for (const definition of collectDefinitions(source))
			definitions.add(definition);
	}

	const missing = Array.from(references)
		.filter((reference) => !definitions.has(reference))
		.sort();

	if (missing.length > 0) {
		console.error('Token coverage failed. Retained bridge variables without definitions:');
		for (const variable of missing)
			console.error(`  ${variable}`);
		process.exitCode = 1;
		return;
	}

	console.log(
		`Token coverage passed: ${references.size} Vite/bridge references are covered by ${definitions.size} definitions.`
	);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
