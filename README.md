# Readwise Reader Importer

A Chrome extension to save multiple links like YouTube playlists to [Readwise reader](https://readwise.io/read) with one click.

## Features

- Extract video URLs from YouTube playlists
- Edit and manage extracted playlists
- Copy, download, and open playlist URLs

## Development

1. Install dependencies:

   ```
   npm install
   ```

2. Build the extension:

   ```
   npm run build
   ```

3. For continuous development:

   ```
   npm run watch
   ```

To install the extension in development:

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
