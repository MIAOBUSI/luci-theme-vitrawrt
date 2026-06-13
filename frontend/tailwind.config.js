export default {
	prefix: 'tw-',
	darkMode: ['selector', '[data-theme="dark"]'],
	content: [
		'../ucode/template/themes/vitrawrt/**/*.ut',
		'../htdocs/luci-static/resources/**/*.js',
		'./src/**/*.{js,css}'
	],
	safelist: [
		'tw-rounded-vw-card',
		'tw-rounded-vw-panel'
	],
	corePlugins: {
		preflight: false
	},
	theme: {
		extend: {
			borderRadius: {
				'vw-control': 'var(--vw-radius-control)',
				'vw-card': 'var(--vw-radius-card)',
				'vw-panel': 'var(--vw-radius-panel)',
				'vw-pill': 'var(--vw-radius-pill)'
			},
			transitionTimingFunction: {
				'vw-standard': 'var(--vw-ease-standard)',
				'vw-spring': 'var(--vw-ease-spring)'
			},
			boxShadow: {
				'vw-card': 'var(--vw-shadow-card)',
				'vw-control': 'var(--vw-shadow-control)',
				'vw-popover': 'var(--vw-shadow-popover)',
				'vw-modal': 'var(--vw-shadow-modal)'
			},
			colors: {
				vw: {
					background: 'var(--vw-background)',
					surface: 'var(--vw-surface)',
					elevated: 'var(--vw-surface-elevated)',
					glass: 'var(--vw-glass-surface)',
					border: 'var(--vw-glass-border)',
					text: 'var(--vw-text-primary)',
					secondary: 'var(--vw-text-secondary)',
					muted: 'var(--vw-text-muted)',
					accent: 'var(--vw-accent)',
					success: 'var(--vw-success)',
					warning: 'var(--vw-warning)',
					danger: 'var(--vw-danger)',
					info: 'var(--vw-info)'
				}
			}
		}
	},
	plugins: []
};
