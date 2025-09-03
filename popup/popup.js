
(function() {
	function setVersion() {
		try {
			const manifest = chrome.runtime.getManifest();
			const versionEl = document.querySelector('.version');
			if (versionEl && manifest && manifest.version) {
				versionEl.textContent = `v${manifest.version}`;
			}
		} catch (_) {}
	}

	function setStatusText(isPaused) {
		const statusEl = document.getElementById('status');
		if (statusEl) statusEl.textContent = isPaused ? 'Paused' : 'Active';
		const toggleBtn = document.getElementById('toggle');
		if (toggleBtn) toggleBtn.textContent = isPaused ? 'Resume globally' : 'Pause globally';
	}

	function setHandlesCount(count) {
		const countEl = document.getElementById('statProfiles');
		if (countEl) countEl.textContent = String(count);
	}

	function init() {
		setVersion();
		chrome.storage.local.get({ paused: false, autoBlockedHandles: [], stats: { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 } }, async ({ paused, autoBlockedHandles, stats }) => {
			setStatusText(Boolean(paused));
			try {
				// Match options learned count behavior: exclude bundled handles
				const url = chrome.runtime.getURL('blocklist/blocklist.json');
				let bundled = new Set();
				try {
					const res = await fetch(url);
					if (res && res.ok) {
						const arr = await res.json();
						bundled = new Set((Array.isArray(arr) ? arr : []).map(h => {
							if (!h) return '';
							h = String(h).trim();
							if (!h) return '';
							if (!h.startsWith('@')) h = '@' + h;
							return h.toLowerCase();
						}).filter(Boolean));
					}
				} catch (_) {}
				const normalize = (h) => { if (!h) return ''; h = String(h).trim(); if (!h) return ''; if (!h.startsWith('@')) h = '@' + h; return h.toLowerCase(); };
				const learned = (Array.isArray(autoBlockedHandles) ? autoBlockedHandles : []).map(normalize).filter(Boolean).filter(h => !bundled.has(h));
				setHandlesCount(learned.length);
			} catch (_) {
				setHandlesCount(Array.isArray(autoBlockedHandles) ? autoBlockedHandles.length : 0);
			}
			try {
				document.getElementById('statTweets').textContent = (stats && stats.tweetsHidden) || 0;
				// profiles stat is set above via learned handles count
				document.getElementById('statKeywords').textContent = (stats && stats.keywordsMatched) || 0;
			} catch (_) {}
		});

		const openOptionsBtn = document.getElementById('openOptions');
		if (openOptionsBtn) {
			openOptionsBtn.addEventListener('click', () => {
				if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
				else window.open('options/options.html');
			});
		}

		const toggleBtn = document.getElementById('toggle');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				chrome.storage.local.get({ paused: false }, ({ paused }) => {
					const next = !paused;
					chrome.storage.local.set({ paused: next }, () => setStatusText(next));
				});
			});
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();


