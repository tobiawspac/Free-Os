// ukladani nastaveni do localStorage
function qpalzm() {

function loadState(key, fallback) {
  try {
    var v = localStorage.getItem('os_' + key);
    if (v != null) return JSON.parse(v)
    return fallback;
  } catch (err) {
    // privatni rezim to blokuje
    return fallback;
  }
}

function saveState(key, value) {
  try {
    localStorage.setItem('os_' + key, JSON.stringify(value));
  } catch (e) {}
}

var settingsState = {
  accent: loadState('accent', '#ff6a39'),
  glass: loadState('glass', true),
  animations: loadState('anim', true),
  volume: loadState('volume', 80),
  wifi: loadState('wifi', true),
  dnd: loadState('dnd', false), // zatim to nic nedela lol
  wallpaper: loadState('wallpaper', 0),
};

// TODO: udelat z toho loop misto copy paste
function saveSettings() {
  saveState('accent', settingsState.accent);
  saveState('glass', settingsState.glass);
  saveState('anim', settingsState.animations);
  saveState('volume', settingsState.volume);
  saveState('wifi', settingsState.wifi);
  saveState('dnd', settingsState.dnd);
  saveState('wallpaper', settingsState.wallpaper);
}

var WALLPAPERS = [
  { name: 'Foto', css: 'url(https://picsum.photos/seed/myos/1920/1080) center/cover no-repeat' },
  { name: 'Modro', css: '#2196f3' },
  { name: 'Fialovo', css: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Zeleno', css: '#4caf50' },
  { name: 'Ruzovo', css: 'radial-gradient(circle, #ff9a9e, #fad0c4)' },
  { name: 'Sunset', css: 'linear-gradient(45deg, #ee0979, #ff6a00)' },
  { name: 'Cerno', css: '#111' },
];

function applyWallpaper() {
  var wp = WALLPAPERS[settingsState.wallpaper] || WALLPAPERS[0];
  var d = document.getElementById('desktop');
  if (d) d.style.background = wp.css;
}

// glass uz vubec nepouzivam v css ale nechavam to tam
function applyGlassSetting() {}

// musi byt global, pouziva to vic souboru
window.loadState = loadState;
window.saveState = saveState;
window.settingsState = settingsState;
window.saveSettings = saveSettings;
window.WALLPAPERS = WALLPAPERS;
window.applyWallpaper = applyWallpaper;
window.applyGlassSetting = applyGlassSetting;
}

qpalzm()
