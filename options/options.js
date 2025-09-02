(function() {
	const DEFAULT_KEYWORDS = [
		"crypto","bitcoin","ethereum","eth","btc","solana","sol","airdrop","nft","web3","altcoin","memecoin","shitcoin","token","ico","ido","seed round","binance","coinbase","pump","moon","ponzi","staking","airdrops","uniswap","defi"
	];

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
			keywords: DEFAULT_KEYWORDS,
			blockedHandles: [],
			exceptions: []
		}, (data) => {
			document.getElementById('keywords').value = (data.keywords || DEFAULT_KEYWORDS).join('\n');
			document.getElementById('handles').value = (data.blockedHandles || []).join('\n');
			document.getElementById('exceptions').value = (data.exceptions || []).join('\n');
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
		chrome.storage.local.set({ keywords, blockedHandles: handles, exceptions }, () => {
			const btn = document.getElementById('save');
			btn.textContent = 'Saved!';
			setTimeout(() => { btn.textContent = 'Save changes'; }, 1200);
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
			const ul = document.getElementById('learnedList');
			ul.innerHTML = '';
			for (const h of learned) {
				const li = document.createElement('li');
				li.textContent = h;
				ul.appendChild(li);
			}
		});
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
		document.getElementById('exportLearned').addEventListener('click', exportLearned);
		document.getElementById('importFile').addEventListener('change', (e) => {
			const file = e.target.files && e.target.files[0];
			if (file) importLearned(file);
			e.target.value = '';
		});
		document.getElementById('clearLearned').addEventListener('click', clearLearned);
	});
})();
