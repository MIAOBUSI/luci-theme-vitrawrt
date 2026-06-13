import './runtime/shell-runtime.js';
import { initProgressEnhancement } from './dom/enhance-progress.js';

if (document.readyState === 'loading')
	document.addEventListener('DOMContentLoaded', initProgressEnhancement, { once: true });
else
	initProgressEnhancement();
