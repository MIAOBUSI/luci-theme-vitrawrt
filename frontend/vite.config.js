import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const packageRoot = resolve(rootDir, '..');

export default defineConfig({
	base: '/luci-static/vitrawrt/dist/',
	publicDir: false,
	build: {
		outDir: resolve(packageRoot, 'htdocs/luci-static/vitrawrt/dist'),
		emptyOutDir: true,
		manifest: false,
		target: 'es2019',
		minify: 'esbuild',
		cssMinify: 'esbuild',
		sourcemap: false,
		cssCodeSplit: true,
		rollupOptions: {
			input: {
				'vitrawrt-apple': resolve(rootDir, 'src/styles/index.css'),
				'vitrawrt-motion': resolve(rootDir, 'src/scripts/index.js')
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name].js',
				assetFileNames: '[name][extname]'
			}
		}
	}
});
