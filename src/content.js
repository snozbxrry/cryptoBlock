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

	const OLD_DEFAULT_KEYWORDS = [
		"crypto","bitcoin","ethereum","eth","btc","solana","sol","airdrop","nft","web3","altcoin","memecoin","shitcoin","token","seed round","binance","coinbase","pumpfun","staking","airdrops","uniswap","defi"
	];

	function arraysEqual(a, b) {
		if (!Array.isArray(a) || !Array.isArray(b)) return false;
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) { if (String(a[i]) !== String(b[i])) return false; }
		return true;
	}

	let keywordList = [];
	let keywordRegex = null;
	let blockedHandles = [];
	let exceptions = [];
	let autoBlockedSet = new Set();
	let bundledSet = new Set();
	let persistTimer = null;
	const sessionAllowlist = new Set();
	let isPaused = false;
	let lastScanTime = 0;
	const SCAN_THROTTLE_MS = 1000; 
	const processedTweets = new WeakSet();
	const processedUserCells = new WeakSet();
	let stats = { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 };
	const countedProfileHandles = new Set();

	function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
	function rebuildKeywordRegex() {
		const parts = (keywordList || [])
			.map(k => (k || "").trim())
			.filter(k => k.length > 0)
			.map(k => {
				const e = escapeRegex(k);
				return `[#\\$]?${e}`;
			});
		if (parts.length === 0) { keywordRegex = null; return; }
		// Match keyword or #keyword or $keyword with loose boundaries around non-word Unicode chars
		keywordRegex = new RegExp(`(^|[^\\p{L}\\p{N}_])(?:${parts.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");
	}
	function normalizeHandle(handle) { if (!handle) return ""; let h = handle.trim(); if (!h.startsWith("@")) h = "@" + h; return h.toLowerCase(); }
	function extractHandleFromHref(href) { try { if (!href) return ""; const clean = href.split('?')[0].split('#')[0]; const seg = clean.split('/').filter(Boolean)[0] || ''; if (!seg) return ""; if (["i","explore","settings","home","notifications"].includes(seg)) return ""; return '@' + seg; } catch (_) { return ""; } }
	function extractHandleFromUrl() { try { return extractHandleFromHref(location.pathname); } catch (_) { return ""; } }
	function schedulePersistAutoBlocklist() { if (persistTimer) clearTimeout(persistTimer); persistTimer = setTimeout(() => { try { chrome.storage.local.set({ autoBlockedHandles: Array.from(autoBlockedSet) }); } catch (_) {} }, 500); }
	function safeSetLocal(obj) { try { if (chrome && chrome.storage && chrome.storage.local) chrome.storage.local.set(obj); } catch (_) {} }
	function incrementStat(statName) { stats[statName] = (stats[statName] || 0) + 1; safeSetLocal({ stats }); }
	function addToAutoBlocklist(handle) { const h = normalizeHandle(handle); if (!h) return; if (bundledSet.has(h)) return; if (!autoBlockedSet.has(h)) { autoBlockedSet.add(h); schedulePersistAutoBlocklist(); if (!countedProfileHandles.has(h)) { countedProfileHandles.add(h); incrementStat('profilesBlocked'); } } }

	function isExcepted(handle) { const h = normalizeHandle(handle); if (!h) return false; if (sessionAllowlist.has(h)) return true; return exceptions.includes(h); }

	function addToExceptionsPersistent(handle) {
		try {
			const h = normalizeHandle(handle);
			if (!h) return;
			exceptions = Array.isArray(exceptions) ? exceptions : [];
			if (exceptions.includes(h)) return;
			exceptions = [...exceptions, h];
			safeSetLocal({ exceptions });
		} catch (_) { /* ignore when extension context is invalidated */ }
	}

	function removeFromExceptionsPersistent(handle) {
		try {
			const h = normalizeHandle(handle);
			if (!h) return;
			exceptions = Array.isArray(exceptions) ? exceptions : [];
			exceptions = exceptions.filter(x => x !== h);
			safeSetLocal({ exceptions });
		} catch (_) { /* ignore when extension context is invalidated */ }
	}

	function normalizeTextForMatch(s) { try { return (s || "").normalize('NFKC'); } catch (_) { return s || ""; } }
	function handleContainsKeyword(handleNorm) {
		if (!handleNorm) return false;
		const h = String(handleNorm).toLowerCase();
		for (const k of keywordList) {
			const kk = String(k || '').toLowerCase().trim();
			if (kk.length < 3) continue;
			if (h.includes(kk)) return true;
		}
		return false;
	}
	function shouldHideTextAndHandle(textContent, authorHandle, learn = false) {
		const text = normalizeTextForMatch(textContent);
		const handleNorm = normalizeHandle(authorHandle);
		if (isExcepted(handleNorm)) return false;
		if (handleNorm && autoBlockedSet.has(handleNorm)) return true;
		if (handleNorm && blockedHandles.includes(handleNorm)) return true;
		if (!keywordRegex) return false;
		const matched = keywordRegex.test(text) || (handleNorm && (keywordRegex.test(handleNorm) || handleContainsKeyword(handleNorm)));
		if (matched && learn && handleNorm) addToAutoBlocklist(handleNorm);
		if (matched) incrementStat('keywordsMatched');
		return matched;
	}
	function getBlockReason(textContent, authorHandle) {
		const text = normalizeTextForMatch(textContent);
		const handleNorm = normalizeHandle(authorHandle);
		if (isExcepted(handleNorm)) return null;
		if (handleNorm && autoBlockedSet.has(handleNorm)) return `Learned handle: ${handleNorm}`;
		if (handleNorm && blockedHandles.includes(handleNorm)) return `Manually blocked: ${handleNorm}`;
		if (!keywordRegex) return null;
		if (keywordRegex.test(text) || (handleNorm && (keywordRegex.test(handleNorm) || handleContainsKeyword(handleNorm)))) {
			const matchedKeywords = keywordList.filter(k => {
				const e = escapeRegex(k);
				const r = new RegExp(`(^|[^\\\p{L}\\\p{N}_])[#\\$]?${e}(?=$|[^\\\p{L}\\\p{N}_])`, 'iu');
				return r.test(text) || (handleNorm && (r.test(handleNorm) || String(handleNorm).toLowerCase().includes(String(k).toLowerCase())));
			});
			return `Keywords: ${matchedKeywords.slice(0, 3).join(', ')}${matchedKeywords.length > 3 ? '...' : ''}`;
		}
		return null;
	}
	function findAuthorHandle(tweetEl) { const withAt = tweetEl.querySelector('a[role="link"] span'); if (withAt && withAt.textContent && withAt.textContent.includes('@')) return withAt.textContent.trim(); let profileLink = tweetEl.querySelector('[data-testid="User-Name"] a[href^="/" i]'); if (!profileLink) profileLink = tweetEl.querySelector('a[role="link"][href^="/" i]'); if (profileLink) { const candidate = extractHandleFromHref(profileLink.getAttribute('href')); if (candidate) return candidate; } const possible = tweetEl.querySelectorAll('span'); for (const span of possible) { const t = span.textContent || ""; if (t.startsWith('@') && t.length > 1 && !t.includes(' ')) return t.trim(); } return ""; }
	function extractTweetText(tweetEl) { let chunks = []; for (const n of tweetEl.querySelectorAll('[data-testid="tweetText"]')) if (n && n.textContent) chunks.push(n.textContent); for (const n of tweetEl.querySelectorAll('div[lang], div[dir]')) if (n && n.textContent) chunks.push(n.textContent); for (const n of tweetEl.querySelectorAll('article [data-testid="tweetText"], article div[lang]')) if (n && n.textContent) chunks.push(n.textContent); if (chunks.length === 0 && tweetEl.textContent) chunks.push(tweetEl.textContent); return chunks.join(' ').replace(/\s+/g,' ').trim(); }
	function hideElement(el) { const cell = el.closest('[data-testid="cellInnerDiv"]') || el.closest('[data-testid="UserCell"]') || el; cell.style.display = 'none'; }
	function processTweet(tweetEl) { try { if (isPaused) return; if (processedTweets.has(tweetEl)) return; processedTweets.add(tweetEl); const text = extractTweetText(tweetEl); const handle = findAuthorHandle(tweetEl); if (shouldHideTextAndHandle(text, handle, true)) { hideElement(tweetEl); incrementStat('tweetsHidden'); } } catch (_) {} }
	function scanExistingTweets() { if (isPaused) return; const now = Date.now(); if (now - lastScanTime < SCAN_THROTTLE_MS) return; lastScanTime = now; const tweets = document.querySelectorAll('article[role="article"]'); for (const t of tweets) processTweet(t); }

	function collectProfileText() { const nameEl = document.querySelector('div[data-testid="UserName"] span'); const bioEl = document.querySelector('div[data-testid="UserDescription"]'); const handleEl = document.querySelector('div[data-testid="UserName"] a[href^="/" i] span'); const name = nameEl ? nameEl.textContent || '' : ''; const bio = bioEl ? bioEl.textContent || '' : ''; let handle = handleEl ? handleEl.textContent || '' : ''; if (!handle) handle = extractHandleFromUrl(); return { text: (name + ' ' + bio).trim(), handle }; }
	function injectFloatingReblock(container, handle) { 
		let btn = container.querySelector('.cryptoBlock-reblock-btn'); 
		if (!btn) { 
			btn = document.createElement('button'); 
			btn.className = 'cryptoBlock-reblock-btn'; 
			btn.textContent = 'Block again'; 
			btn.style.position = 'absolute'; 
			btn.style.top = '8px'; 
			btn.style.right = '8px'; 
			btn.style.zIndex = '10000'; 
			btn.style.background = '#ef4444'; 
			btn.style.border = 'none'; 
			btn.style.color = '#fff'; 
			btn.style.padding = '6px 10px'; 
			btn.style.borderRadius = '6px'; 
			btn.style.cursor = 'pointer'; 
			container.style.position = container.style.position || 'relative'; 
			container.appendChild(btn); 
		} 
		btn.onclick = () => { 
			const h = normalizeHandle(handle || extractHandleFromUrl()); 
			if (h) { 
				sessionAllowlist.delete(h); 
				removeFromExceptionsPersistent(h); 
				if (autoBlockedSet.has(h)) { 
					autoBlockedSet.delete(h); 
					schedulePersistAutoBlocklist(); 
				} 
			} 
			applyProfilePageBlocking(); 
		}; 
		btn.style.display = 'block'; 
	}
	function hideFloatingReblock(container) { const btn = container.querySelector('.cryptoBlock-reblock-btn'); if (btn) btn.style.display = 'none'; }
	function ensureProfileCover(container, handle, blockReason = null) { let cover = container.querySelector('.cryptoBlock-profile-cover'); if (!cover) { cover = document.createElement('div'); cover.className = 'cryptoBlock-profile-cover'; cover.style.position = 'absolute'; cover.style.inset = '0'; cover.style.background = '#000'; cover.style.color = '#fff'; cover.style.display = 'flex'; cover.style.flexDirection = 'column'; cover.style.alignItems = 'center'; cover.style.justifyContent = 'center'; cover.style.gap = '12px'; cover.style.fontSize = '16px'; cover.style.zIndex = '9999'; const msg = document.createElement('div'); msg.textContent = 'Profile hidden by cryptoBlock'; const reasonEl = document.createElement('div'); reasonEl.className = 'cryptoBlock-reason'; reasonEl.style.fontSize = '14px'; reasonEl.style.color = '#ccc'; reasonEl.style.textAlign = 'center'; reasonEl.style.maxWidth = '300px'; reasonEl.style.lineHeight = '1.4'; const btn = document.createElement('button'); btn.textContent = 'Show profile'; btn.style.background = '#1d9bf0'; btn.style.border = 'none'; btn.style.color = '#fff'; btn.style.padding = '8px 14px'; btn.style.borderRadius = '6px'; btn.style.cursor = 'pointer'; btn.addEventListener('click', () => { const hUrl = extractHandleFromUrl(); const hText = normalizeHandle(handle); const chosen = normalizeHandle(hText || hUrl); if (chosen) { sessionAllowlist.add(chosen); addToExceptionsPersistent(chosen); if (autoBlockedSet.has(chosen)) { autoBlockedSet.delete(chosen); schedulePersistAutoBlocklist(); } } cover.style.display = 'none'; const timelineRegion = container.querySelector('section[role="region"], [data-testid="primaryColumn"] section[role="region"]'); if (timelineRegion) timelineRegion.style.display = ''; injectFloatingReblock(container, chosen); }); cover.appendChild(msg); cover.appendChild(reasonEl); cover.appendChild(btn); container.style.position = container.style.position || 'relative'; container.appendChild(cover); } const reasonEl = cover.querySelector('.cryptoBlock-reason'); if (reasonEl) { reasonEl.textContent = blockReason || ''; reasonEl.style.display = blockReason ? 'block' : 'none'; } return cover; }
	function applyProfilePageBlocking() { try { const main = document.querySelector('main[role="main"]'); if (!main) return; let container = main.querySelector('div[data-testid="primaryColumn"]') || main; const { text, handle } = collectProfileText(); const handleNorm = normalizeHandle(handle || extractHandleFromUrl());
		if (isPaused) { const cover = ensureProfileCover(container, handleNorm); if (cover) cover.style.display = 'none'; const timelineRegion = container.querySelector('section[role="region"]'); if (timelineRegion) timelineRegion.style.display = ''; hideFloatingReblock(container); return; }
		if (handleNorm && sessionAllowlist.has(handleNorm)) { const cover = ensureProfileCover(container, handleNorm); if (cover) cover.style.display = 'none'; const timelineRegion = container.querySelector('section[role="region"]'); if (timelineRegion) timelineRegion.style.display = ''; injectFloatingReblock(container, handleNorm); return; }
		// Fast path: if the handle alone warrants blocking, cover immediately to avoid scroll/jump
		if (handleNorm && !isExcepted(handleNorm)) {
			const handleTriggers = autoBlockedSet.has(handleNorm)
				|| blockedHandles.includes(handleNorm)
				|| (keywordRegex && (keywordRegex.test(handleNorm) || handleContainsKeyword(handleNorm)));
			if (handleTriggers) {
				// Learn this handle so stats align with learned count
				addToAutoBlocklist(handleNorm);
				const blockReason = getBlockReason('', handleNorm) || `Learned handle: ${handleNorm}`;
				const cover = ensureProfileCover(container, handleNorm, blockReason);
				const timelineRegion = container.querySelector('section[role="region"]');
				if (timelineRegion) timelineRegion.style.display = 'none';
				if (cover) cover.style.display = 'flex';
				hideFloatingReblock(container);
				container.style.minHeight = '100vh';
				// No direct profilesBlocked increment here; addToAutoBlocklist handles unique counting
				return;
			}
		}
		const hide = shouldHideTextAndHandle(text, handleNorm, true);
		if (hide) { const blockReason = getBlockReason(text, handleNorm); const cover = ensureProfileCover(container, handleNorm, blockReason); const timelineRegion = container.querySelector('section[role="region"]'); if (timelineRegion) timelineRegion.style.display = 'none'; if (cover) cover.style.display = 'flex'; hideFloatingReblock(container); container.style.minHeight = '100vh'; } else { const cover = ensureProfileCover(container, handleNorm); if (cover) cover.style.display = 'none'; const timelineRegion = container.querySelector('section[role="region"]'); if (timelineRegion) timelineRegion.style.display = ''; hideFloatingReblock(container); }
	} catch (_) {} }

	function isOnSearchPage() { return location.pathname.startsWith('/search'); }
	function isOnPeopleSearchPage() { if (!isOnSearchPage()) return false; try { const params = new URLSearchParams(location.search); const f = (params.get('f') || '').toLowerCase(); return f === 'user' || f === 'users' || f === 'people'; } catch (_) { return false; } }
	function scanSearchPeopleCells() { if (isPaused) return; const now = Date.now(); if (now - lastScanTime < SCAN_THROTTLE_MS) return; lastScanTime = now; const timeline = document.querySelector('[aria-label^="Timeline:"]'); const cells = (timeline || document).querySelectorAll('[data-testid="UserCell"], [data-testid="cellInnerDiv"]'); for (const cell of cells) processUserCell(cell); }
	function scanSearchTweets() { if (isPaused) return; const now = Date.now(); if (now - lastScanTime < SCAN_THROTTLE_MS) return; lastScanTime = now; const timeline = document.querySelector('[aria-label^="Timeline:"]'); const arts = (timeline || document).querySelectorAll('[data-testid="cellInnerDiv"] article, article[role="article"]'); for (const a of arts) processTweet(a); }

	function observeTimeline() {
		const root = document.body;
		const observer = new MutationObserver((mutations) => {
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (!(node instanceof HTMLElement)) continue;
					if (isPaused) continue;
					if (node.matches && node.matches('article[role="article"]')) {
						processTweet(node);
					} else if (node.matches && node.matches('[data-testid="cellInnerDiv"]')) {
						const arts = node.querySelectorAll('article');
						for (const a of arts) processTweet(a);
						const cells = node.querySelectorAll('[data-testid="UserCell"], [data-testid="TypeaheadUser"], [data-testid="UserCell-Enhanced"]');
						for (const c of cells) processUserCell(c);
					} else if (node.matches && (node.matches('[data-testid="UserCell"]') || node.matches('[data-testid="TypeaheadUser"]'))) {
						processUserCell(node);
					} else {
						const nestedTweets = node.querySelectorAll ? node.querySelectorAll('article[role=\"article\"]') : [];
						for (const t of nestedTweets) processTweet(t);
						const nestedCells = node.querySelectorAll ? node.querySelectorAll('[data-testid=\"UserCell\"], [data-testid=\"TypeaheadUser\"], [data-testid=\"UserCell-Enhanced\"], [data-testid=\"cellInnerDiv\"]') : [];
						for (const c of nestedCells) { if (c.matches && c.matches('article')) processTweet(c); else processUserCell(c); }
					}
				}
			}
		});
		observer.observe(root, { childList: true, subtree: true });
		setInterval(() => {
			if (isPaused) return;
			if (isOnSearchPage()) { scanSearchTweets(); scanSearchPeopleCells(); }
		}, 2000);
	}

	function extractUserCellInfo(userCell) { let handle = ''; let text = ''; const userNameGroup = userCell.querySelector('[data-testid="User-Name"]'); if (userNameGroup) { const spans = userNameGroup.querySelectorAll('span'); for (const s of spans) { const t = (s.textContent || '').trim(); if (t.startsWith('@') && t.length > 1 && !t.includes(' ')) { handle = t; break; } } } if (!handle) { const profileLink = userCell.querySelector('a[href^="/" i][role="link"]'); if (profileLink) handle = extractHandleFromHref(profileLink.getAttribute('href')); } const bio = userCell.querySelector('[data-testid="UserDescription"], div[dir]'); const nameNode = userCell.querySelector('[data-testid="User-Name"]'); text = [nameNode ? nameNode.textContent : '', bio ? bio.textContent : ''].join(' ').trim(); if (!text) text = (userCell.textContent || '').trim(); return { handle, text }; }
	function processUserCell(el) { try { if (isPaused) return; if (processedUserCells.has(el)) return; processedUserCells.add(el); const info = extractUserCellInfo(el); if (shouldHideTextAndHandle(info.text, info.handle, true)) { hideElement(el); /* profilesBlocked aligns to learned via addToAutoBlocklist */ } } catch (_) {} }
	function scanExistingUserCells() { const cells = document.querySelectorAll('[data-testid="UserCell"], [data-testid="TypeaheadUser"], [data-testid="UserCell-Enhanced"], [data-testid="cellInnerDiv"]'); for (const c of cells) processUserCell(c); }

	async function mergeBundledBlocklist() {
		try {
			const url = chrome.runtime.getURL('blocklist/blocklist.json');
			const res = await fetch(url);
			if (!res.ok) return;
			const arr = await res.json();
			if (Array.isArray(arr)) {
				bundledSet = new Set(arr.map(normalizeHandle).filter(Boolean));
				for (const h of bundledSet) {
					if (autoBlockedSet.has(h)) autoBlockedSet.delete(h);
				}
			}
		} catch (_) {}
	}

	function loadSettingsAndStart() {
		chrome.storage.local.get({ autoBlockedHandles: [], keywords: INLINE_DEFAULT_KEYWORDS, blockedHandles: [], exceptions: [], paused: false, stats: { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 } }, async (local) => {
			const DEFAULT_KEYWORDS = await getSharedDefaults();
			// Migrate keywords if user has the exact old defaults
			if (arraysEqual(local.keywords, OLD_DEFAULT_KEYWORDS)) {
				try { chrome.storage.local.set({ keywords: DEFAULT_KEYWORDS }); } catch (_) {}
				local.keywords = DEFAULT_KEYWORDS;
			}
			autoBlockedSet = new Set((local.autoBlockedHandles || []).map(normalizeHandle));
			isPaused = Boolean(local.paused);
			await mergeBundledBlocklist();
			keywordList = Array.isArray(local.keywords) ? local.keywords : DEFAULT_KEYWORDS;
			blockedHandles = (Array.isArray(local.blockedHandles) ? local.blockedHandles : []).map(normalizeHandle);
			exceptions = (Array.isArray(local.exceptions) ? local.exceptions : []).map(normalizeHandle);
			stats = local.stats || { tweetsHidden: 0, profilesBlocked: 0, keywordsMatched: 0 };
			rebuildKeywordRegex();
			scanExistingTweets();
			scanExistingUserCells();
			if (isOnSearchPage()) { scanSearchTweets(); scanSearchPeopleCells(); }
			observeTimeline();
			applyProfilePageBlocking();
			setInterval(applyProfilePageBlocking, 3000);
		});
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area !== 'local') return;
			if (Object.prototype.hasOwnProperty.call(changes, 'paused')) {
				isPaused = Boolean(changes.paused.newValue);
				applyProfilePageBlocking();
			}
			if (Object.prototype.hasOwnProperty.call(changes, 'keywords')) {
				keywordList = Array.isArray(changes.keywords.newValue) ? changes.keywords.newValue : keywordList;
				rebuildKeywordRegex();
			}
			if (Object.prototype.hasOwnProperty.call(changes, 'blockedHandles')) {
				blockedHandles = (Array.isArray(changes.blockedHandles.newValue) ? changes.blockedHandles.newValue : blockedHandles).map(normalizeHandle);
			}
			if (Object.prototype.hasOwnProperty.call(changes, 'exceptions')) {
				exceptions = (Array.isArray(changes.exceptions.newValue) ? changes.exceptions.newValue : exceptions).map(normalizeHandle);
			}
			if (Object.prototype.hasOwnProperty.call(changes, 'autoBlockedHandles')) {
				autoBlockedSet = new Set((changes.autoBlockedHandles.newValue || []).map(normalizeHandle));
			}
		});
	}
	document.addEventListener('DOMContentLoaded', loadSettingsAndStart);
	if (document.readyState === 'interactive' || document.readyState === 'complete') { loadSettingsAndStart(); }
})();
