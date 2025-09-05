# cryptoBlock for X (Twitter)

Note: This project is licensed for noncommercial use only. See `LICENSE`.

**Current Version:** v0.2.1

A powerful Chrome extension that automatically hides tweets, profiles, and content related to cryptocurrency, NFTs, and blockchain on X (formerly Twitter). cryptoBlock helps you maintain a cleaner timeline by filtering out crypto-related content while preserving your ability to see other posts.

## 🚀 Features

### Core Functionality
- **Automatic Content Filtering**: Hides tweets containing crypto-related keywords
- **Profile Blocking**: Blocks entire profiles that post crypto content
- **Smart Learning**: Automatically learns and blocks handles that frequently post crypto content
- **Search Page Filtering**: Filters crypto content from search results and user searches
- **Global Pause/Resume**: Temporarily disable filtering without losing learned data

### Advanced Features
- **Exception Management**: Allow specific handles to bypass filtering
- **Session Allowlist**: Temporarily show blocked profiles during your session
- **Bundled Blocklist**: Pre-configured list of known crypto accounts
- **JSON Import/Export**: Backup and restore keywords, manual, exceptions, and learned lists
- **Real-time Updates**: Immediate filtering as new content loads

## 📦 Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/cryptoblock-for-x-twitter/jncldnaiolbmembbpmfdeoagcdjjnjeb)
2. Click "Add to Chrome"
3. Confirm the installation

### Privacy & Security
- **Privacy Policy**: [View our privacy policy](https://raw.githubusercontent.com/snozbxrry/cryptoBlock/main/PRIVACY_POLICY.md)
- **No Data Collection**: We don't collect, store, or transmit any personal information
- **Client-Side Only**: All processing happens locally in your browser
- **Open Source**: Full source code available for transparency

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The cryptoBlock icon should appear in your toolbar

## 🎯 How It Works

### Keyword-Based Filtering
cryptoBlock uses a comprehensive list of crypto-related keywords to identify content:
- **Cryptocurrencies**: bitcoin, ethereum, solana, etc.
- **Platforms**: binance, coinbase, metamask, etc.
- **Concepts**: nft, web3, defi, airdrop, etc.
- **Trading Terms**: ico, ido, seed, token, etc.

### Smart Profile Learning
The extension learns from your interactions:
1. When a tweet matches crypto keywords, the author's handle is noted
2. After multiple matches, the handle is automatically added to the blocklist
3. This creates a personalized filter that improves over time

### Content Detection
cryptoBlock analyzes:
- **Tweet Text**: Main content and replies
- **Profile Information**: Bio, display name, and handle
- **Search Results**: Both tweet and user search results
- **Timeline Content**: Home feed, profile timelines, and trending topics

## 🛠️ Usage

### Basic Usage
1. **Install and Enable**: The extension works automatically after installation
2. **Browse Normally**: Visit X/Twitter as usual - crypto content will be hidden
3. **View Status**: Click the extension icon to see current status and learned handles

### Popup Interface
The extension popup provides:
- **Status Display**: Shows if filtering is active or paused
- **Pause/Resume**: Temporarily disable filtering globally
- **Handle Counter**: Shows how many handles have been learned
- **Options Access**: Quick link to advanced settings

### Advanced Configuration
Access the options page for:
- **Custom Keywords**: Add or remove filtering keywords
- **Manual Blocklist**: Manually add handles to block
- **Exception List**: Allow specific handles to bypass filtering
- **Data Management**: Import/export your blocklists

## 📁 File Structure

```
cryptblock/
├── manifest.json              # Extension configuration
├── icons/
│   └── cB.png                 # Extension icon
├── popup/
│   ├── popup.html             # Popup interface
│   ├── popup.css              # Popup styling
│   └── popup.js               # Popup functionality
├── options/
│   ├── options.html           # Options page
│   ├── options.css            # Options styling
│   └── options.js             # Options functionality
├── src/
│   └── content.js             # Main content script
├── blocklist/
│   └── blocklist.json         # Bundled blocklist
└── README.md                  # This file
```

## 🔧 Configuration

### JSON Import/Export
You can backup and restore your configuration (Options toolbar → Export all / Import all). Learned handles exclude bundled blocklist entries to avoid duplicates.

**Export Format:**
```json
{
  "keywords": ["crypto", "bitcoin", "ethereum"],
  "blockedHandles": ["@cryptouser1", "@cryptouser2"],
  "exceptions": ["@legitimateuser"],
  "autoBlockedHandles": ["@learneduser1", "@learneduser2"]
}
```

**Import Process:**
1. Go to Options → toolbar → Import all
2. Select your backup file (cryptoBlock-settings.json)
3. Confirm the import

### Custom Keywords
Add your own filtering terms:
1. Open Options → Keywords
2. Add new keywords (one per line)
3. Save changes
4. Keywords are case-insensitive and support partial matches

### Exception Management
Allow specific handles to bypass filtering:
1. **Temporary**: Click "Show profile" on a blocked profile
2. **Permanent**: Add to exceptions list in options
3. **Session-based**: Automatically expires when you close the tab

## 🎨 Customization

### Styling
The extension uses minimal styling that doesn't interfere with X's interface:
- **Hidden Content**: Completely removed from DOM
- **Profile Covers**: Black overlay with white text
- **Buttons**: Styled to match X's design language

### Performance
- **Efficient Filtering**: Cached regex with support for hashtags/cashtags and Unicode
- **Minimal DOM Impact**: MutationObserver with de-duplication to avoid reprocessing
- **Memory Management**: Automatic cleanup and throttled scans

## 🔒 Privacy & Security

### Data Storage
- **Local Storage Only**: All data stays on your device
- **No External Requests**: Extension doesn't send data to external servers
- **Minimal Permissions**: Only requests access to X/Twitter domains

### Permissions Explained
- **Storage**: Save your preferences and learned handles
- **Host Permissions**: Access X/Twitter to filter content
- **No Personal Data**: Extension doesn't access your personal information

## 🐛 Troubleshooting

### Common Issues

**Extension Not Working:**
1. Check if it's enabled in `chrome://extensions/`
2. Refresh the X/Twitter page
3. Check if the extension has permission to access the site

**Content Still Showing:**
1. Verify the extension is not paused
2. Check if the content matches your keyword list
3. Try adding more specific keywords

**Performance Issues:**
1. Clear old learned handles in options
2. Reduce the number of custom keywords
3. Restart the browser

### Reset Extension
If you encounter issues:
1. Go to Options → Data Management
2. Click "Reset All Data"
3. Confirm the reset
4. Restart the extension

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup
1. Clone the repository
2. Load the extension in Chrome developer mode
3. Make your changes
4. Test thoroughly on X/Twitter
5. Submit a pull request

### Areas for Contribution
- **Keyword Lists**: Add more crypto-related terms
- **UI Improvements**: Enhance the popup or options interface
- **Performance**: Optimize filtering algorithms
- **Bug Fixes**: Report and fix issues
- **Documentation**: Improve this README

### Reporting Issues
When reporting bugs, please include:
- Chrome version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable

## 📄 License

This project is licensed under the PolyForm Noncommercial License 1.0.0. You may use it for personal or internal, noncommercial purposes only. See the [LICENSE](LICENSE) file for full terms.

## 🙏 Acknowledgments

- **X/Twitter**: For providing the platform
- **Chrome Extensions API**: For enabling content filtering
- **Open Source Community**: For inspiration and feedback

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Twitter/X**: Contact [@snozbxrry](https://x.com/snozbxrry) for support
- **Chrome Web Store**: Leave reviews and ratings

## 🔄 Version History

### v0.2.1 (Current)
- Fixed "block again" button functionality
- Unified keyword defaults across options and content scripts
- Added shared defaults.json for consistent keyword management
- Improved profile blocking statistics alignment
- Better migration handling for existing users
- Enhanced error handling and fallbacks

### v0.2.0
- Improved keyword matching with Unicode support
- Enhanced handle detection for embedded crypto terms
- Better search page filtering (all tabs)
- Full settings export/import functionality
- Noncommercial license added
- UI improvements and bug fixes

### v0.1.0
- Initial release
- Basic keyword filtering
- Profile blocking
- Smart learning system
- JSON import/export
- Global pause/resume

### Planned Features
- **v0.3.0**: Multiple profile support
- **v0.4.0**: Custom CSS themes
- **v0.5.0**: Analytics dashboard

---

**Made with ❤️ for a cleaner X/Twitter experience**

*cryptoBlock is not affiliated with X Corp. or Twitter, Inc.*
