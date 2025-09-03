(function() {
	const INLINE_DEFAULT_KEYWORDS = [
		"crypto","bitcoin","ethereum","eth","btc","solana","sol","airdrop","nft","web3","altcoin","memecoin","shitcoin","token","seed round","binance","coinbase","pumpfun","staking","airdrops","uniswap","defi"
	];

	async function getSharedDefaults() {
		try {
			const url = chrome.runtime.getURL('src/defaults.json');
			const res = await fetch(url);
			if (!res || !res.ok) return INLINE_DEFAULT_KEYWORDS;
			const arr = await res.json();
			return Array.isArray(arr) ? arr.map(s => String(s).trim()).filter(Boolean) : INLINE_DEFAULT_KEYWORDS;
		} catch (_) { return INLINE_DEFAULT_KEYWORDS; }
	}

	// Previous default list (to migrate users who still have the old defaults saved)
	const OLD_DEFAULT_KEYWORDS = [
		"crypto","bitcoin","ethereum","eth","btc","solana","sol","airdrop","nft","web3","altcoin","memecoin","shitcoin","token","ico","ido","seed round","binance","coinbase","pump","moon","ponzi","staking","airdrops","uniswap","defi"
	];

	function arraysEqual(a, b) {
		if (!Array.isArray(a) || !Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) { if (String(a[i]) !== String(b[i])) return false; }
		return true;
	}

	function normalizeHandle(h) {
		if (!h) return '';
		h = h.trim();
		if (!h) return '';
		if (!h.startsWith('@')) h = '@' + h;
		return h.toLowerCase();
	}

	async function getBundledSet() {
		try {
			const url = chrome.runtime.getURL('blocklist/blocklist.json');
			const res = await fetch(url);
			if (!res.ok) return new Set();
			const arr = await res.json();
			return new Set((Array.isArray(arr) ? arr : []).map(normalizeHandle).filter(Boolean));
		} catch (_) { return new Set(); }
	}

	function load() {
		chrome.storage.local.get({
			keywords: INLINE_DEFAULT_KEYWORDS,
			blockedHandles: [],
			exceptions: [],
			stats: { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 },
			theme: 'dark'
		}, async (data) => {
			const DEFAULT_KEYWORDS = await getSharedDefaults();
			// Migrate old default keywords to new defaults if unchanged by the user
			if (arraysEqual(data.keywords, OLD_DEFAULT_KEYWORDS)) {
				chrome.storage.local.set({ keywords: DEFAULT_KEYWORDS });
				data.keywords = DEFAULT_KEYWORDS;
			}
			document.getElementById('keywords').value = (data.keywords || DEFAULT_KEYWORDS).join('\n');
			document.getElementById('handles').value = (data.blockedHandles || []).join('\n');
			document.getElementById('exceptions').value = (data.exceptions || []).join('\n');
			updateStats(data.stats || { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 });
			setTheme(data.theme || 'dark');
		});
		refreshLearned();
	}

	function save() {
		const keywords = document.getElementById('keywords').value
			.split(/\n+/)
			.map(s => s.trim())
			.filter(Boolean);
		const handles = document.getElementById('handles').value
			.split(/\n+/)
			.map(normalizeHandle)
			.filter(Boolean);
		const exceptions = document.getElementById('exceptions').value
			.split(/\n+/)
			.map(normalizeHandle)
			.filter(Boolean);
		chrome.storage.local.get({ autoBlockedHandles: [] }, (local) => {
			const learned = new Set((local.autoBlockedHandles || []).map(normalizeHandle));
			for (const ex of exceptions) { if (learned.has(ex)) learned.delete(ex); }
			// If the user saved a list that matches shared defaults exactly, keep it as is; otherwise, store their custom list
			chrome.storage.local.set({ keywords, blockedHandles: handles, exceptions, autoBlockedHandles: Array.from(learned) }, () => {
			const btn = document.getElementById('save');
			btn.textContent = 'Saved!';
			setTimeout(() => { btn.textContent = 'Save changes'; }, 1200);
			refreshLearned();
		});
		});
	}

	function resetDefaults() {
		document.getElementById('keywords').value = DEFAULT_KEYWORDS.join('\n');
		document.getElementById('handles').value = '';
		document.getElementById('exceptions').value = '';
		save();
	}

	function refreshLearned() {
		chrome.storage.local.get({ autoBlockedHandles: [] }, async (local) => {
			const bundled = await getBundledSet();
			const learned = (local.autoBlockedHandles || []).map(normalizeHandle).filter(Boolean).filter(h => !bundled.has(h)).sort();
			document.getElementById('learnedCount').textContent = learned.length.toString();
			// Keep Profiles Blocked stat aligned with learned handles count
			const profilesBlockedEl = document.getElementById('profilesBlocked');
			if (profilesBlockedEl) profilesBlockedEl.textContent = learned.length.toString();
			const ul = document.getElementById('learnedList');
			ul.innerHTML = '';
			for (const h of learned) {
				const li = document.createElement('li');
				li.textContent = h;
				ul.appendChild(li);
			}
		});
	}

	function exportAll() {
		chrome.storage.local.get({ keywords: DEFAULT_KEYWORDS, blockedHandles: [], exceptions: [], autoBlockedHandles: [] }, async (data) => {
			const bundled = await getBundledSet();
			const autoBlockedHandles = (data.autoBlockedHandles || []).map(normalizeHandle).filter(Boolean).filter(h => !bundled.has(h));
			const payload = {
				keywords: Array.isArray(data.keywords) ? data.keywords : DEFAULT_KEYWORDS,
				blockedHandles: (data.blockedHandles || []).map(normalizeHandle).filter(Boolean),
				exceptions: (data.exceptions || []).map(normalizeHandle).filter(Boolean),
				autoBlockedHandles
			};
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'cryptoBlock-settings.json';
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	function importAll(file) {
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const obj = JSON.parse(reader.result);
				if (!obj || typeof obj !== 'object') return;
				const bundled = await getBundledSet();
				const keywords = Array.isArray(obj.keywords) ? obj.keywords.map(s => String(s).trim()).filter(Boolean) : undefined;
				const blockedHandles = Array.isArray(obj.blockedHandles) ? obj.blockedHandles.map(normalizeHandle).filter(Boolean) : undefined;
				const exceptions = Array.isArray(obj.exceptions) ? obj.exceptions.map(normalizeHandle).filter(Boolean) : undefined;
				const autoBlockedHandles = Array.isArray(obj.autoBlockedHandles) ? obj.autoBlockedHandles.map(normalizeHandle).filter(Boolean).filter(h => !bundled.has(h)) : undefined;
				const toSet = {};
				if (keywords) toSet.keywords = keywords;
				if (blockedHandles) toSet.blockedHandles = blockedHandles;
				if (exceptions) toSet.exceptions = exceptions;
				if (autoBlockedHandles) toSet.autoBlockedHandles = Array.from(new Set(autoBlockedHandles));
				chrome.storage.local.set(toSet, () => {
					load();
					refreshLearned();
				});
			} catch (_) {}
		};
		reader.readAsText(file);
	}

	function resetAll() {
		chrome.storage.local.set({ keywords: DEFAULT_KEYWORDS, blockedHandles: [], exceptions: [], autoBlockedHandles: [] }, () => {
			load();
			refreshLearned();
		});
	}

	function updateStats(stats) {
		document.getElementById('tweetsHidden').textContent = stats.tweetsHidden || 0;
		document.getElementById('profilesBlocked').textContent = stats.profilesBlocked || 0;
		document.getElementById('keywordsMatched').textContent = stats.keywordsMatched || 0;
	}

	function resetStats() {
		chrome.storage.local.set({ stats: { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 } }, () => {
			updateStats({ tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 });
		});
	}

	function setTheme(theme) {
		document.body.className = theme === 'light' ? 'light-theme' : '';
		document.querySelectorAll('.theme-btn').forEach(btn => {
			btn.classList.toggle('active', btn.dataset.theme === theme);
		});
		chrome.storage.local.set({ theme });
	}

	function exportLearned() {
		chrome.storage.local.get({ autoBlockedHandles: [] }, async (local) => {
			const bundled = await getBundledSet();
			const list = (local.autoBlockedHandles || []).map(normalizeHandle).filter(Boolean).filter(h => !bundled.has(h));
			const data = JSON.stringify(list, null, 2);
			const blob = new Blob([data], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'cryptoBlock-learned-blocklist.json';
			a.click();
			URL.revokeObjectURL(url);
		});
	}

	function importLearned(file) {
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const arr = JSON.parse(reader.result);
				if (Array.isArray(arr)) {
					const bundled = await getBundledSet();
					const normalized = Array.from(new Set(arr.map(normalizeHandle).filter(Boolean).filter(h => !bundled.has(h))));
					chrome.storage.local.get({ autoBlockedHandles: [] }, (local) => {
						const merged = Array.from(new Set([...(local.autoBlockedHandles || []).map(normalizeHandle), ...normalized]));
						chrome.storage.local.set({ autoBlockedHandles: merged }, refreshLearned);
					});
				}
			} catch (_) {}
		};
		reader.readAsText(file);
	}

	function clearLearned() {
		chrome.storage.local.set({ autoBlockedHandles: [] }, refreshLearned);
	}

	document.addEventListener('DOMContentLoaded', () => {
		load();
		document.getElementById('save').addEventListener('click', save);
		document.getElementById('reset').addEventListener('click', resetDefaults);
		document.getElementById('exportAll').addEventListener('click', exportAll);
		document.getElementById('importAllFile').addEventListener('change', (e) => {
			const file = e.target.files && e.target.files[0];
			if (file) importAll(file);
			e.target.value = '';
		});
		document.getElementById('exportLearned').addEventListener('click', exportLearned);
		document.getElementById('importFile').addEventListener('change', (e) => {
			const file = e.target.files && e.target.files[0];
			if (file) importLearned(file);
			e.target.value = '';
		});
		document.getElementById('clearLearned').addEventListener('click', clearLearned);
		document.getElementById('resetStats').addEventListener('click', resetStats);
		
		// Theme toggle
		document.querySelectorAll('.theme-btn').forEach(btn => {
			btn.addEventListener('click', () => setTheme(btn.dataset.theme));
		});
		
		// Optional: expose a full reset button via Shift+Reset defaults
		document.getElementById('reset').addEventListener('click', (e) => {
			if (e.shiftKey) {
				resetAll();
			}
		});
	});
})();
