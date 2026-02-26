// ------------------------------------------------------------
// ASCII folding + slugifier
// To keep this plugin lightweight, without needing additional libs like slugify or speakingurl
// Slug structure of Souloverai simply reverse engineered thru testing, slug turns out to be the ID of artist in json dataset
// These functions should do the job in 99% of cases 
// ------------------------------------------------------------
function asciiFold(str) {
    return str
        .trim()
        .toLowerCase()
        .normalize("NFD")       //Normalization Form Decomposition -> split letter and umlaut
        .replace(/[\u0300-\u036f]/g, "") // remove all the umlaut
        .replace(/ß/g, "ss")    // convert some special charaters discovered thru testing
        .replace(/æ/g, "ae")
        .replace(/œ/g, "oe")
        .replace(/ø/g, "o")
        .replace(/ð/g, "d")
        .replace(/þ/g, "th")
        .replace(/ł/g, "l")
        .replace(/đ/g, "d")
        .replace(/ŋ/g, "ng")
        .replace(/ƒ/g, "f");
}

function toSouloveraiSlug(name) {
    return asciiFold(name)
        .replace(/&/g, " and ")
        .replace(/[\/\\]/g, "-")
        .replace(/\*/g, "-")
        .replace(/\./g, "-")
        .replace(/_/g, "-")
        .replace(/"/g, "-")
        .replace(/:/g, "-")
        .replace(/[^a-z0-9\s-]/g, "") // remove all remaining special chars
        .replace(/\s+/g, "-") // one ore more spaces converted into '-'
        .replace(/-+/g, "-") // collapse multiple '-' into a single '-'
        .replace(/^-+|-+$/g, ""); // remove leading and trailing '-'
}

// ------------------------------------------------------------
// Load cached artist map, which was written to cache by the background service worker
// ------------------------------------------------------------
async function loadCachedArtistMap() {
    const { artistMap } = await chrome.storage.local.get("artistMap");
    return artistMap || {};
}

// ------------------------------------------------------------
// Search the artist in the artist dump
// ------------------------------------------------------------
function findArtist(artistmap, artistID) {
    return artistmap[artistID] || null;
}

// ------------------------------------------------------------
// Extract currently playing artist(s) from Spotify webplayer
// ------------------------------------------------------------
async function extractArtists() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const nodes = document.querySelectorAll('[data-testid="context-item-info-artist"]');
            const artists = Array.from(nodes).map(n => n.textContent.trim());
            return [...new Set(artists)]; // remove duplicates
        }
    });

    return result[0].result || [];
}

// ------------------------------------------------------------
// Render and formatting functions for the results
// ------------------------------------------------------------
function renderResults(results) {
    const container = document.getElementById("results");

    container.innerHTML = results.map(r => `
        <div class="artist-row">
            <span class="artist-name">${r.artist}</span>

            ${
                r.listed
                ? `
                    <span class="artist-status listed">✔ listed</span>
                  `
                : `
                    <span class="artist-status missing">✘ not listed</span>
                  `
            }
        </div>
        ${
            r.listed
            ?`
                <div class="tab-info">
                    <p><strong>Disclosure:</strong> ${formatDisclosure(r.listed.disclosure)}</p>
                    <p><strong>Markers:</strong> ${formatList(r.listed.markers)}</p>
                </div>
            `
            : ""
        }
    `).join("");
}

function renderTabInfo() {
    const container = document.getElementById("results");

    container.innerHTML = `
        <div class="tab-info">
            <p>⚠ This tool only works on the <b>Spotify Web Player</b>.</p>
        </div>
    `;
}

function formatDisclosure(value) {
  const map = {
    confirmed: "Yes (self‑disclosed)",
    full: "Fully AI‑generated",
    partial: "Partially uses AI",
    none: "No disclosure"
  };

  return map[value] || value;
}

function formatList(arr) {
  if (!arr || arr.length === 0) return "None";
  return arr.join(", ");
}

// ------------------------------------------------------------
// Main function
// ------------------------------------------------------------
async function run() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isSpotify = tab?.url?.includes("open.spotify.com");
    const artistMap = await loadCachedArtistMap();

    if(isSpotify){
        const artists = await extractArtists();

        const results = [];
        for (const artist of artists) {
            const artistID = toSouloveraiSlug(artist);
            const listed = await findArtist(artistMap,artistID)
            results.push({ artist, artistID, listed });
        }

        renderResults(results);
    } else {
         renderTabInfo() ;
    }
}

run();