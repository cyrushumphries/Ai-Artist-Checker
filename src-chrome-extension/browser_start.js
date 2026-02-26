// ------------------------------------------------------------
// Load bundled artist dump from Souloverai project on startup and install
// into a dictionary and into cache under the name "artistMap"
// ------------------------------------------------------------
async function loadAndCacheArtistDictionary() {
    const url = chrome.runtime.getURL("souloverai/artists.json");
    const response = await fetch(url);
    const array = await response.json();
    const map = {};
    for (const entry of array) {
        map[entry.id] = entry;
    }
    await chrome.storage.local.set({ artistMap: map });
}

chrome.runtime.onStartup.addListener(async () => {
    await loadAndCacheArtistDictionary();
});

chrome.runtime.onInstalled.addListener(async () => {
    await loadAndCacheArtistDictionary();
});