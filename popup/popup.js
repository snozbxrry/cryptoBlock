
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
		const countEl = document.getElementById('handlesCount');
		if (countEl) countEl.textContent = `${count} handles learned on this device.`;
	}

	function init() {
		setVersion();
		chrome.storage.local.get({ paused: false, autoBlockedHandles: [] }, ({ paused, autoBlockedHandles }) => {
			setStatusText(Boolean(paused));
			setHandlesCount(Array.isArray(autoBlockedHandles) ? autoBlockedHandles.length : 0);
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


