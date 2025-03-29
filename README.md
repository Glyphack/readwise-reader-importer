# Readwise Reader Importer

A Chrome extension to save multiple links like YouTube playlists to [Readwise reader](https://readwise.io/read) with one click.

## Install

[link-chrome]: https://chromewebstore.google.com/detail/readwise-reader-importer/biaidjfcmkeeiidenndhkdaldkljaipi 'Version published on Chrome Web Store'
[<img src="https://raw.githubusercontent.com/alrra/browser-logos/90fdf03c/src/chrome/chrome.svg" width="48" alt="Chrome" valign="middle">][link-chrome] [<img valign="middle" src="https://img.shields.io/chrome-web-store/v/hlepfoohegkhhmjieoechaddaejaokhf.svg?label=%20">][link-chrome] and other Chromium browsers

## Features

- Extract URLs from YouTube playlists
- Edit extracted playlists
- Import URLs to Readwise.


Supported Sources:
- [x] Youtube Playlists
- [ ] Blog Archives
- Submit your ideas.

## Development

1. Install dependencies:

   ```
   npm install
   ```

2. Build the extension:

   ```
   npm run build
   ```

3. (Optional) For continuous build:

   ```
   npm run dev
   ```

## Install From Source:

First build the extension following above steps.

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the extension directory
4. The extension should now be installed and visible in your browser

## Usage

1. Open the extension from the top bar in Chrome.
2. Configure your Readwise API key. You can get the token from [here](https://readwise.io/access_token).
3. Navigate to a YouTube Playlist. Click on the extension and press Save.
4. In the editor you can see the links being saved and edit them. If all good click save to Readwise.
5. Enjoy reading.
