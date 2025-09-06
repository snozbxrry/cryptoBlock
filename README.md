# cryptoBlock for X (Twitter)

**Current Version:** v0.2.1

A Chrome extension that hides tweets, profiles, and content related to cryptocurrency, NFTs, and blockchain on X (formerly Twitter).

## Features

- **Automatic Content Filtering**: Hides tweets containing crypto-related keywords
- **Profile Blocking**: Blocks entire profiles that post crypto content
- **Smart Learning**: Automatically learns and blocks handles that frequently post crypto content
- **Search Page Filtering**: Filters crypto content from search results
- **Global Pause/Resume**: Temporarily disable filtering
- **Exception Management**: Allow specific handles to bypass filtering
- **JSON Import/Export**: Backup and restore settings

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store page](https://chromewebstore.google.com/detail/cryptoblock-for-x-twitter/jncldnaiolbmembbpmfdeoagcdjjnjeb)
2. Click "Add to Chrome"
3. Confirm the installation

### Privacy & Security
- **Privacy Policy**: [View our privacy policy](https://raw.githubusercontent.com/snozbxrry/cryptoBlock/main/PRIVACY_POLICY.md)
- **No Data Collection**: All processing happens locally in your browser
- **Open Source**: Full source code available

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The cryptoBlock icon should appear in your toolbar

## Usage

1. Install and enable the extension
2. Visit X/Twitter as usual - crypto content will be hidden
3. Click the extension icon to see status and learned handles

### Configuration
Access the options page for:
- Custom keywords
- Manual blocklist
- Exception list
- Data management

### JSON Import/Export
Backup and restore your configuration (Options → Export all / Import all).

**Export Format:**
```json
{
  "keywords": ["crypto", "bitcoin", "ethereum"],
  "blockedHandles": ["@cryptouser1", "@cryptouser2"],
  "exceptions": ["@legitimateuser"],
  "autoBlockedHandles": ["@learneduser1", "@learneduser2"]
}
```

### Custom Keywords
Add your own filtering terms in Options → Keywords. Keywords are case-insensitive and support partial matches.

### Exception Management
Allow specific handles to bypass filtering:
- **Temporary**: Click "Show profile" on a blocked profile
- **Permanent**: Add to exceptions list in options

## Privacy & Security

- **Local Storage Only**: All data stays on your device
- **No External Requests**: Extension doesn't send data to external servers
- **Minimal Permissions**: Only requests access to X/Twitter domains

## Troubleshooting

**Extension Not Working:**
1. Check if it's enabled in `chrome://extensions/`
2. Refresh the X/Twitter page

**Content Still Showing:**
1. Verify the extension is not paused
2. Check if the content matches your keyword list

**Reset Extension:**
1. Go to Options → Data Management
2. Click "Reset All Data"

## License

This project is licensed under the PolyForm Noncommercial License 1.0.0. You may use it for personal or internal, noncommercial purposes only. See the [LICENSE](LICENSE) file for full terms.

## Support

- **GitHub Issues**: Report bugs and request features
- **Twitter/X**: Contact [@snozbxrry](https://x.com/snozbxrry) for support

## Version History

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

---

**Note:** The GitHub version is updated more frequently than the Chrome Web Store version.

*cryptoBlock is not affiliated with X Corp. or Twitter, Inc.*
