'use strict';
'require baseclass';
'require ui';

return baseclass.extend({
	__init__() {
		ui.menu.load().then((tree) => this.render(tree));
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (let i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	isSelected(name, level) {
		return L.env.dispatchpath[level] === name;
	},

	handleMenuExpand(ev) {
		const li = ev.currentTarget.closest('li');

		if (!li)
			return;

		li.classList.toggle('expanded');
		ev.currentTarget.setAttribute('aria-expanded', li.classList.contains('expanded') ? 'true' : 'false');
		ev.preventDefault();
		ev.stopPropagation();
	},

	iconFor(child, url, level) {
		const haystack = [
			child && child.name,
			child && child.title,
			url
		].join(' ').toLowerCase();

		if (/(reboot|shutdown|power)/.test(haystack))
			return 'reboot';

		if (/(logout|exit)/.test(haystack))
			return 'logout';

		if (/(overview|概览|status\/overview)/.test(haystack))
			return 'overview';

		if (/(package|software|opkg|apk|软件包|packages)/.test(haystack))
			return 'packages';

		if (/(startup|init|启动项)/.test(haystack))
			return 'startup';

		if (/(process|进程)/.test(haystack))
			return 'processes';

		if (/(syslog|dmesg|kernel log|system log|log|日志)/.test(haystack))
			return 'logs';

		if (/(firewall|nftables|防火墙)/.test(haystack))
			return 'firewall';

		if (/(interfaces|interface|ifaces|网络接口|接口)/.test(haystack))
			return 'interfaces';

		if (/(dhcp|dns|dnsmasq)/.test(haystack))
			return 'dhcp';

		if (/(routes|route|routing|静态路由)/.test(haystack) && !/(vpn|proxy|passwall|openclash|tunnel)/.test(haystack))
			return 'routes';

		if (/(diagnostics|ping|traceroute|nslookup|诊断)/.test(haystack))
			return 'diagnostics';

		if (/(dropbear|ssh|authorized keys|authorized_keys)/.test(haystack))
			return 'ssh';

		if (/(wireless|wifi|wlan|radio)/.test(haystack))
			return 'wireless';

		if (/(vpn|proxy|passwall|openclash|tunnel)/.test(haystack))
			return 'vpn';

		if (/(nas|samba|ksmbd|nfs|share|storage|disk|mount)/.test(haystack))
			return 'nas';

		if (/(statistics|vnstat|traffic|chart|monitor|统计|流量)/.test(haystack))
			return 'statistics';

		if (/(status|overview|process|log|nftables|状态|概览|日志|进程)/.test(haystack))
			return 'status';

		if (/(network|interface|firewall|dhcp|route|switch|网络|接口|防火墙)/.test(haystack))
			return 'network';

		if (/(services|service|plugin|daemon|服务)/.test(haystack))
			return 'services';

		if (/(system|startup|software|package|flash|backup|系统|软件包|启动项)/.test(haystack))
			return 'system';

		return level === 1 ? 'generic' : 'dot';
	},

	renderMenuLevel(tree, url, level) {
		const l = (level || 0) + 1;
		const ul = E('ul', { 'class': 'vwrt-menu l%d'.format(l) });
		const children = ui.menu.getChildren(tree);

		if (children.length == 0 || l > 2)
			return E([]);

		children.forEach((child) => {
			const childUrl = url + '/' + child.name;
			const childChildren = ui.menu.getChildren(child);
			const selected = this.isSelected(child.name, l);
			const hasChildren = childChildren.length > 0 && l < 2;
			const title = _(child.title);
			const icon = this.iconFor(child, childUrl, l);
			const classes = [
				'vwrt-menu-item-%s'.format(child.name),
				selected ? 'selected' : '',
				selected ? 'active expanded' : '',
				hasChildren ? 'has-children' : ''
			].filter(Boolean).join(' ');

			const rowChildren = [
				E('a', {
					'href': L.url(childUrl),
					'aria-label': title,
					'data-vwrt-tooltip': title,
					'data-vwrt-menu-level': String(l),
					'data-vwrt-menu-icon': icon
				}, [
					E('span', {
						'class': 'vwrt-menu-icon vwrt-icon-%s'.format(icon),
						'aria-hidden': 'true'
					}),
					E('span', { 'class': 'vwrt-menu-label' }, [ title ])
				])
			];

			if (hasChildren) {
				rowChildren.push(E('button', {
					'type': 'button',
					'class': 'vwrt-menu-expander',
					'aria-label': _('Toggle section'),
					'aria-expanded': selected ? 'true' : 'false',
					'click': ui.createHandlerFn(this, 'handleMenuExpand')
				}));
			}

			ul.appendChild(E('li', { 'class': classes }, [
				E('div', { 'class': 'vwrt-menu-row' }, rowChildren),
				this.renderMenuLevel(child, childUrl, l)
			]));
		});

		return ul;
	},

	renderMainMenu(tree, url) {
		const container = document.querySelector('#vitrawrt-sidebar-menu');

		if (!container)
			return;

		container.innerHTML = '';
		container.appendChild(this.renderMenuLevel(tree, url, 0));
		this.limitExpandedGroups(container);
	},

	limitExpandedGroups(container) {
		const topLevel = container.querySelector('.vwrt-menu.l1');

		if (!topLevel)
			return;

		const expanded = Array.from(topLevel.children).filter((li) => li.classList.contains('expanded'));

		if (expanded.length <= 3)
			return;

		const activeName = L.env.dispatchpath[1];

		expanded.forEach((li) => {
			if (activeName && li.classList.contains('vwrt-menu-item-%s'.format(activeName)))
				return;

			li.classList.remove('expanded', 'active', 'selected');

			const button = li.querySelector(':scope > .vwrt-menu-row > .vwrt-menu-expander');
			if (button)
				button.setAttribute('aria-expanded', 'false');
		});
	},

	renderModeMenu(tree) {
		const menu = document.querySelector('#modemenu');
		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			if (menu) {
				menu.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
					E('a', { 'href': L.url(child.name) }, [ _(child.title) ])
				]));
			}

			if (isActive)
				this.renderMainMenu(child, child.name);
		});

		if (menu && menu.children.length > 1)
			menu.style.display = '';
	},

	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const ul = E('ul', { 'class': 'tabs cbi-tabmenu' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		if (!container || children.length == 0)
			return E([]);

		children.forEach((child) => {
			const isActive = (L.env.dispatchpath[3 + (level || 0)] == child.name);
			const activeClass = isActive ? ' active cbi-tab' : '';
			const className = 'tabmenu-item-%s%s'.format(child.name, activeClass);

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ])
			]));

			if (isActive)
				activeNode = child;
		});

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);

		return ul;
	}
});
