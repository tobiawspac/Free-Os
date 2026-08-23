// FreeOs - hlavni script
// poznamka: je to vsechno v jednom souboru, casem rozdelim

console.log('freeos start');

function loadState(key, fallback) {
  try {
    var v = localStorage.getItem('os_' + key);
    if (v != null) {
      return JSON.parse(v)
    }
    return fallback;
  } catch (err) {
    // localStorage muze byt bloknutej (privatni rezim apod)
    return fallback;
  }
}

function saveState(key, value) {
  try {
    localStorage.setItem('os_' + key, JSON.stringify(value));
  } catch (e) {}
}

var windows = new Map(); // id -> {el, appId,...}
let zIndexCounter = 100;
var activeWindowId = null;
let activeDrag = null;
var activeResize = null;
let iconDragState = null;

var settingsState = {
  accent: loadState('accent', '#ff6a39'),
  glass: loadState('glass', true),
  animations: loadState('anim', true),
  volume: loadState('volume', 80),
  wifi: loadState('wifi', true),
  dnd: loadState('dnd', false), // zatim nic nedela lol
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

var desktop = document.getElementById('desktop');
var snapPreview = document.getElementById("snap-preview");
const openAppsContainer = document.getElementById('open-apps');
const spotlightOverlay = document.getElementById('spotlight-overlay');
const spotlightInput = document.getElementById('spotlight-input');
const spotlightResults = document.getElementById('spotlight-results');
const controlCenter = document.getElementById('control-center');
const controlCenterBtn = document.getElementById('cc-btn');
var contextMenu = document.getElementById('context-menu');
const selectionBox = document.getElementById('selection-box');
const osMenu = document.getElementById('os-menu');
const osLogoBtn = document.getElementById('os-logo-btn');
var desktopIcons = document.querySelector('.desktop-icons');

function applyGlassSetting() {
  document.documentElement.classList.toggle('no-glass', !settingsState.glass);
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
  desktop.style.background = wp.css;
}

var apps = {
  notepad: { title: 'About Me', width: 500, height: 380,
    factory: () => { const n = document.getElementById('tpl-notepad').content.cloneNode(true); initNotepad(n); return n; } },
  calculator: { title: 'Calculator', width: 320, height: 420,
    factory: () => { const n = document.getElementById('tpl-calculator').content.cloneNode(true); initCalculator(n); return n; } },
  settings: { title: 'Settings', width: 400, height: 300,
    factory: () => { const n = document.getElementById('tpl-settings').content.cloneNode(true); initSettings(n); return n; } },
  console: { title: 'Console', width: 560, height: 380,
    factory: () => { const n = document.getElementById('tpl-console').content.cloneNode(true); initConsole(n); return n; } },
  browser: { title: 'Browser', width: 700, height: 500,
    factory: () => { const n = document.getElementById('tpl-browser').content.cloneNode(true); initBrowser(n); return n; } },
  snake: { title: 'Snake', width: 360, height: 460,
    factory: () => { const n = document.getElementById('tpl-snake').content.cloneNode(true); initSnake(n); return n; } },
};

// free plan = max 3 okna najednou
var windowCascadeIndex = 0;

function clampPosition(left, top, w, h) {
  // 52 = taskbar, 28 = status bar (natvrdo, sry)
  return {
    left: Math.max(-w + 60, Math.min(left, window.innerWidth - 60)),
    top: Math.max(28, Math.min(top, window.innerHeight - 52 - 20))
  };
}

function getCascadePosition(w, h) {
  const idx = windowCascadeIndex % 6;
  windowCascadeIndex++;
  return clampPosition(80 + idx * 150, 60 + idx * 100, w, h);
}

function openApp(appId) {
  var app = apps[appId];
  if (!app) return;
  const id = 'win-' + Date.now();
  var tpl = document.getElementById('tpl-window');
  var win = tpl.content.firstElementChild.cloneNode(true);
  win.dataset.id = id;
  win.dataset.app = appId;
  win.style.width = app.width + 'px';
  win.style.height = app.height + 'px';
  const pos = getCascadePosition(app.width, app.height);
  win.style.left = pos.left + 'px';
  win.style.top = pos.top + 'px';
  win.style.zIndex = ++zIndexCounter;
  win.querySelector('.window-title').textContent = app.title;
  win.querySelector('.window-content').appendChild(app.factory());
  win.querySelector('.close').onclick = () => closeWindow(id);
  win.querySelector('.minimize').onclick = () => minimizeWindow(id);
  win.querySelector('.maximize').onclick = () => toggleMaximize(id);
  win.addEventListener('mousedown', () => focusWindow(id));
  setupDrag(win); setupResize(win); setupSnap(win);
  desktop.appendChild(win);
  windows.set(id, { el: win, appId: appId, maximized: false, prevRect: null });
  focusWindow(id); updateTaskbar();
  // console.log('open', appId);
  if (settingsState.animations) {
    win.animate([{ opacity: 0, transform: 'scale(0.92) translateY(12px)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 250, easing: 'cubic-bezier(0.16,1,0.3,1)' });
  }
}

function closeWindow(id) {
  var w = windows.get(id);
  if (!w) return;
  function finish() {
    w.el.remove();
    windows.delete(id);
    if (activeWindowId === id) activeWindowId = null;
    updateTaskbar();
  }
  if (settingsState.animations) {
    w.el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.92) translateY(12px)' }],
      { duration: 180 }).onfinish = finish;
  } else {
    finish();
  }
}

function minimizeWindow(id) {
  const w = windows.get(id);
  if (!w) return;
  w.el.classList.add('minimized');
  if (activeWindowId === id) activeWindowId = null;
  updateTaskbar();
}

function toggleMaximize(id) {
  const w = windows.get(id);
  if (!w) return;
  if (w.maximized) {
    var r = w.prevRect;
    w.el.style.left = r.left;
    w.el.style.top = r.top;
    w.el.style.width = r.width;
    w.el.style.height = r.height;
    w.el.classList.remove('maximized');
    w.maximized = false;
  } else {
    // ulozime si predchozi rect abychom to mohli vratit
    w.prevRect = { left: w.el.style.left, top: w.el.style.top, width: w.el.style.width, height: w.el.style.height };
    w.el.classList.add('maximized');
    w.maximized = true;
  }

}

function focusWindow(id) {
  var w = windows.get(id);
  if (!w || w.el.classList.contains('minimized')) return;
  w.el.style.zIndex = ++zIndexCounter;
  w.el.classList.add('active');
  if (activeWindowId && activeWindowId != id) {
    var prev = windows.get(activeWindowId);
    if (prev) prev.el.classList.remove('active');
  }
  activeWindowId = id;
  updateTaskbar();
}

function restoreWindow(id) {
  var w = windows.get(id);
  if (!w) return;
  w.el.classList.remove('minimized');
  focusWindow(id);
}

function hideSnapPreview() { snapPreview.classList.add('hidden'); }

document.addEventListener('mousemove', function(e) {
  if (activeDrag) {
    const pos = clampPosition(activeDrag.initLeft + e.clientX - activeDrag.startX,
      activeDrag.initTop + e.clientY - activeDrag.startY,
      activeDrag.win.offsetWidth, activeDrag.win.offsetHeight);
    activeDrag.win.style.left = pos.left + 'px'; activeDrag.win.style.top = pos.top + 'px';
    showSnapPreview(e.clientX);
  }
  if (activeResize) {
    var r = activeResize;
    var dx = e.clientX - r.startX, dy = e.clientY - r.startY;
    if (r.dir.indexOf('e') !== -1) r.win.style.width = Math.max(280, r.startW + dx) + 'px';
    if (r.dir.indexOf('s') !== -1) r.win.style.height = Math.max(180, r.startH + dy) + 'px';
    if (r.dir.indexOf('w') !== -1) { var nw = Math.max(280, r.startW - dx); r.win.style.width = nw + 'px'; r.win.style.left = (r.startL + r.startW - nw) + 'px'; }
    if (r.dir.indexOf('n') !== -1) { var nh = Math.max(180, r.startH - dy); r.win.style.height = nh + 'px'; r.win.style.top = (r.startT + r.startH - nh) + 'px'; }
  }
  if (iconDragState && iconDragState.ghost) {
    iconDragState.ghost.style.left = (e.clientX - iconDragState.offsetX) + 'px';
    iconDragState.ghost.style.top = (e.clientY - iconDragState.offsetY) + 'px';
  }
  if (selectState.active) {
    var x = Math.min(selectState.startX, e.clientX);
    var y = Math.min(selectState.startY, e.clientY);
    var sw = Math.abs(e.clientX - selectState.startX);
    var sh = Math.abs(e.clientY - selectState.startY);
    Object.assign(selectionBox.style, { left: x + 'px', top: y + 'px', width: sw + 'px', height: sh + 'px', display: 'block' });
    updateIconSelection();
  }
});

document.addEventListener('mouseup', function() {
  if (activeDrag) {
    activeDrag.win.style.transition = '';
    document.body.style.cursor = '';
    var snap = getSnapZone(activeDrag.lastX);
    if (snap) applySnap(activeDrag.win, snap);
    hideSnapPreview();
    activeDrag = null;
  }
  if (activeResize) { activeResize.win.style.transition = ''; activeResize = null; }
  if (selectState.active) {
    selectState.active = false;
    selectionBox.style.display = 'none';
  }
});

document.addEventListener('mouseleave', function() { hideSnapPreview(); });

function setupDrag(win) {
  var titlebar = win.querySelector('.window-titlebar');
  titlebar.addEventListener('mousedown', function(e) {
    if (e.target.closest('.window-controls')) return;
    hideSnapPreview();
    win.style.transition = 'none';
    document.body.style.cursor = 'grabbing';
    activeDrag = { win: win, startX: e.clientX, startY: e.clientY, initLeft: win.offsetLeft, initTop: win.offsetTop, lastX: e.clientX };
  });
}

function showSnapPreview(x) {
  var zone = getSnapZone(x);
  if (!zone) { snapPreview.classList.add('hidden'); return; }
  Object.assign(snapPreview.style, { left: zone.left, top: zone.top, width: zone.width, height: zone.height });
  snapPreview.classList.remove('hidden');
}

function getSnapZone(x) {
  var w = window.innerWidth;
  var h = window.innerHeight - 52;
  var m = 40; // okraj kdy se to chytne
  if (x < m) return { left: '0', top: '28px', width: '50%', height: (h - 28) + 'px' };
  if (x > w - m) return { left: '50%', top: '28px', width: '50%', height: (h - 28) + 'px' };
  return null;
}

function applySnap(win, zone) {
  var w = windows.get(win.dataset.id);
  if (w && w.maximized) {
    w.el.classList.remove('maximized'); w.maximized = false;
  }
  Object.assign(win.style, { left: zone.left, top: zone.top, width: zone.width, height: zone.height });
}

function setupResize(win) {
  win.querySelectorAll('.resize-handle').forEach(function(h) {
    h.addEventListener('mousedown', function(e) {
      e.stopPropagation();
      win.style.transition = 'none';
      var dir = '';
      var classes = h.className.split(' ');
      for (var i = 0; i < classes.length; i++) {
        if (classes[i].indexOf('resize-') === 0) dir = classes[i].replace('resize-', '');
      }
      activeResize = { win: win, dir: dir,
        startX: e.clientX, startY: e.clientY,
        startW: win.offsetWidth, startH: win.offsetHeight,
        startL: win.offsetLeft, startT: win.offsetTop };
    });
  });
}

function setupSnap(win) {
  win.querySelector('.window-titlebar').addEventListener('dblclick', function(e) {
    if (e.target.closest('.window-controls')) return;
    toggleMaximize(win.dataset.id);
  });
}

function updateTaskbar() {
  openAppsContainer.innerHTML = '';
  windows.forEach(function(w, id) {
    var app = apps[w.appId];
    var btn = document.createElement('button');
    btn.className = 'taskbar-app';
    if (id === activeWindowId && !w.el.classList.contains('minimized')) btn.classList.add('active');
    if (w.el.classList.contains('minimized')) btn.classList.add('minimized');
    btn.innerHTML = '<span>' + app.title + '</span>';
    btn.onclick = function() {
      if (w.el.classList.contains('minimized')) restoreWindow(id);
      else if (id === activeWindowId) minimizeWindow(id);
      else focusWindow(id);
    };
    openAppsContainer.appendChild(btn);
  });
}

var selectState = { active: false, startX: 0, startY: 0 };

desktop.addEventListener('mousedown', function(e) {
  if (e.target.closest('.icon') || e.target.closest('.window') || e.target.closest('.fab')) return;
  if (e.button !== 0) return;
  selectState.active = true;
  selectState.startX = e.clientX;
  selectState.startY = e.clientY;
  desktopIcons.querySelectorAll('.icon.selected').forEach(function(i) { i.classList.remove('selected'); });
});

function updateIconSelection() {
  var box = selectionBox.getBoundingClientRect();
  desktopIcons.querySelectorAll('.icon').forEach(function(icon) {
    var r = icon.getBoundingClientRect();
    // overlap test
    var overlaps = !(r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom);
    icon.classList.toggle('selected', overlaps);
  });
}

function showUpgradeNotification(msg) {
  var toast = document.createElement('div');
  toast.className = 'upgrade-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(function() { toast.classList.add('visible'); });
  setTimeout(function() {
    toast.classList.remove('visible');
    // pozor: pri no-anim transitionend nevystreli a toast zustane viset v DOM
    // zatim me to netrapi
    toast.addEventListener('transitionend', function() { toast.remove(); });
  }, 3000);
}

function initCalculator(root) {
  var display = root.querySelector('.calc-display');
  var current = '0';
  var previous = '';
  var operator = null;
  var resetNext = false;
  function updateDisplay() { display.textContent = current; }
  function compute(a, b, op) {
    var x = parseFloat(a), y = parseFloat(b);
    switch (op) {
      case 'add': return x + y;
      case 'subtract': return x - y;
      case 'multiply': return x * y;
      case 'divide': return y !== 0 ? x / y : 'Error'; // deleni nulou
      default: return b;
    }
  }
  root.querySelectorAll('.calc-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var action = btn.dataset.action;
      var val = btn.textContent.trim();
      if (action === 'clear') { current = '0'; previous = ''; operator = null; resetNext = false; }
      else if (action === 'sign') { current = String(-parseFloat(current)); } // pri "Error" da NaN, whatever
      else if (action === 'percent') { current = String(parseFloat(current) / 100); }
      else if (action === 'equals') {
        if (operator && previous !== '') {
          current = String(compute(previous, current, operator));
          previous = ''; operator = null; resetNext = true;
        }
      }
      else if (action === 'add' || action === 'subtract' || action === 'multiply' || action === 'divide') {
        if (operator && previous !== '' && !resetNext) {
          current = String(compute(previous, current, operator));
        }
        previous = current; operator = action; resetNext = true;
      }
      else {
        if (resetNext || current === '0') { current = val; resetNext = false; }
        else { current += val; }
      }
      updateDisplay();
    });
  });
}

function initSettings(root) {
  var accentPicker = root.querySelector('#accent-picker');
  var glassToggle = root.querySelector('#glass-toggle');
  var animToggle = root.querySelector('#anim-toggle');
  accentPicker.value = settingsState.accent;
  glassToggle.checked = settingsState.glass;
  animToggle.checked = settingsState.animations;
  accentPicker.onchange = function() {
    settingsState.accent = accentPicker.value;
    document.documentElement.style.setProperty('--accent', settingsState.accent); // FIXME: --accent uz v css nikde neni, takze to nic nedela
    saveSettings();
  };
  glassToggle.onchange = function() {
    settingsState.glass = glassToggle.checked;
    saveSettings(); applyGlassSetting();
  };
  renderWallpaperGrid(root);
  animToggle.onchange = function() {
    settingsState.animations = animToggle.checked;
    saveSettings();
    document.documentElement.classList.toggle('no-anim', !animToggle.checked);
  };
}

function renderWallpaperGrid(root) {
  var grid = root.querySelector('#wallpaper-grid');
  if (!grid) return; // kdyztak
  grid.innerHTML = '';
  WALLPAPERS.forEach(function(wp, i) {
    var swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'wallpaper-swatch' + (i === settingsState.wallpaper ? ' active' : '');
    swatch.style.background = wp.css;
    swatch.title = wp.name;
    swatch.setAttribute('aria-label', wp.name);
    swatch.onclick = function() {
      settingsState.wallpaper = i;
      saveSettings();
      applyWallpaper();
      grid.querySelectorAll('.wallpaper-swatch').forEach(function(s) { s.classList.remove('active'); });
      swatch.classList.add('active');
    };
    grid.appendChild(swatch);
  });
}

function initConsole(root) {
  var output = root.querySelector('.console-output');
  var input = root.querySelector('.console-input');
  var welcome = document.createElement('div');
  welcome.className = 'welcome';
  welcome.textContent = 'Welome to FreeOs Console!! Type "help" for commands.';
  output.appendChild(welcome);

  function log(text, className) {
    var div = document.createElement('div');
    div.className = 'result ' + (className || '');
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function exec(cmd) {
    var line = document.createElement('div');
    line.className = 'cmd-line';
    line.innerHTML = '<span class="prompt">></span> ' + cmd; // FIXME: escapovat html?
    output.appendChild(line);
    var c = cmd.trim().toLowerCase();
    if (c === 'help') log('Commands: help, clear, echo <text>, date, time, version, apps, sudo');
    else if (c === 'clear') output.innerHTML = ''; // smaze i welcome a uz se nevrati :)
    else if (c.indexOf('echo ') === 0) log(cmd.slice(5));
    else if (c === 'date') log(new Date().toLocaleDateString());
    else if (c === 'time') log(new Date().toLocaleTimeString());
    else if (c === 'version') log('FreeOs v1.0 (beta)');
    else if (c === 'apps') log('Avilable: notepad, calculator, settings, console, browser');
    else if (c === 'sudo') log('nice try');
    else if (c === '') {}
    else log('Unknown command: ' + cmd, 'error');
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      exec(input.value);
      input.value = '';
    }
  });
}

function initBrowser(root) {
  var urlInput = root.querySelector('.browser-url');
  var goBtn = root.querySelector('.browser-go');
  var frame = root.querySelector('.browser-frame');
  function navigate() {
    var url = urlInput.value.trim();
    if (url.indexOf('http') !== 0) url = 'https://' + url;
    try {
      frame.src = url;
    } catch (err) {
      console.error(err);
    }
  }
  goBtn.onclick = navigate;
  urlInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') navigate(); });
  // spousta webu tohle blokne (x-frame-options), ale co uz
  frame.addEventListener('load', function() {
    try { urlInput.value = frame.contentWindow.location.href; } catch (e) {}
  });
}

function initSnake(root) {
  var canvas = root.querySelector('.snake-canvas');
  var scoreEl = root.querySelector('.snake-score');
  var hint = root.querySelector('.snake-hint');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var CELL = 16, COLS = 20, ROWS = 22;
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  var snake, dir, nextDir, food, score, alive, timer;

  function rand(n) { return Math.floor(Math.random() * n); }

  function placeFood() {
    do { food = { x: rand(COLS), y: rand(ROWS) }; }
    while (snake.some(function(s) { return s.x === food.x && s.y === food.y; }));
  }

  function reset() {
    snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }];
    dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
    score = 0; alive = true;
    scoreEl.textContent = '0';
    hint.style.display = 'none';
    placeFood();
    draw();
  }

  function draw() {
    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ff5577';
    ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);
    snake.forEach(function(s, i) {
      ctx.fillStyle = i === 0 ? '#8ef7c1' : '#4cc9f0';
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }

  function step() {
    if (!alive) return;
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS ||
        snake.some(function(s) { return s.x === head.x && s.y === head.y; })) {
      alive = false;
      hint.textContent = 'Game over! Score ' + score + ' — click to restart';
      hint.style.display = 'block';
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++; scoreEl.textContent = score; placeFood();
    } else {
      snake.pop();
    }
    draw();
  }

  function setDir(nx, ny) {
    if (dir.x === -nx && dir.y === -ny) return; // no reversing into self
    nextDir = { x: nx, y: ny };
  }

  canvas.addEventListener('click', function() { if (!alive) reset(); });

  // keyboard only controls this snake window when it is the active one
  requestAnimationFrame(function() {
    var win = canvas.closest('.window');
    document.addEventListener('keydown', function(e) {
      if (win && activeWindowId !== win.dataset.id) return;
      var k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') setDir(0, -1);
      else if (k === 'ArrowDown' || k === 's' || k === 'S') setDir(0, 1);
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') setDir(-1, 0);
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') setDir(1, 0);
      else return;
      e.preventDefault();
    });
  });

  reset();
  timer = setInterval(step, 130);
}

document.querySelectorAll('.icon').forEach(function(icon) {
  icon.addEventListener('click', function() { openApp(icon.dataset.app); });
  icon.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openApp(icon.dataset.app); }
  });
});

// smazal jsem ten platebni modal, do future maybe pridam donate link

var startBtn = document.querySelector('.start-btn');

function toggleOsMenu(anchor) {
  var willShow = osMenu.classList.contains('hidden');
  osMenu.classList.toggle('hidden');
  if (willShow) {
    var r = anchor.getBoundingClientRect();
    // od taskbaru nahoru, ze status baru dolu
    if (anchor === startBtn) {
      osMenu.style.left = r.left + 'px';
      osMenu.style.top = '';
      osMenu.style.bottom = (window.innerHeight - r.top + 8) + 'px';
    } else {
      osMenu.style.left = r.left + 'px';
      osMenu.style.bottom = '';
      osMenu.style.top = (r.bottom + 6) + 'px';
    }
  }
}

startBtn.onclick = function(e) {
  e.stopPropagation();
  toggleOsMenu(startBtn);
};

osLogoBtn.onclick = function(e) {
  e.stopPropagation();
  toggleOsMenu(osLogoBtn);
};

document.querySelectorAll('.os-menu-item').forEach(function(item) {
  item.onclick = function() {
    var action = item.dataset.action;
    if (action === 'about') alert('FreeOs - A web desktop experience');
    else if (action === 'settings') openApp('settings');
    else if (action === 'reset') { localStorage.clear(); location.reload(); }
    osMenu.classList.add('hidden');
  };
});

document.addEventListener('click', function(e) {
  if (!osMenu.contains(e.target) && e.target !== startBtn) osMenu.classList.add('hidden');
  if (!controlCenter.contains(e.target) && e.target !== controlCenterBtn) controlCenter.classList.add('hidden');
  [document.getElementById('sb-wifi-popover'), document.getElementById('sb-battery-popover'), document.getElementById('sb-clock-popover')].forEach(function(p) {
    if (!p.contains(e.target)) p.classList.add('hidden');
  });
  contextMenu.classList.add('hidden');
});

controlCenterBtn.onclick = function(e) {
  e.stopPropagation();
  controlCenter.classList.toggle('hidden');
};

document.querySelectorAll('.cc-toggle').forEach(function(btn) {
  var id = btn.id.replace('cc-', '');
  var key = id === 'anim' ? 'animations' : id; // hack kvuli jmenum
  btn.classList.toggle('active', !!settingsState[key]);
  btn.onclick = function() {
    settingsState[key] = !settingsState[key];
    btn.classList.toggle('active', settingsState[key]);
    if (key === 'glass') applyGlassSetting();
    if (key === 'wifi') document.getElementById('wifi-status').textContent = settingsState.wifi ? 'Connected' : 'Disconnected';
    saveSettings();
  };
});

document.getElementById('cc-volume').value = settingsState.volume;
document.getElementById('cc-volume').oninput = function(e) {
  settingsState.volume = parseInt(e.target.value);
  // FIXME: sb-volume se pri tom neaktualizuje (jen opacnym smerem to jede)
  saveSettings();
};
document.getElementById('sb-volume').value = settingsState.volume;
document.getElementById('sb-volume').oninput = function(e) {
  settingsState.volume = parseInt(e.target.value);
  document.getElementById('cc-volume').value = settingsState.volume; // sync obou slideru
  saveSettings();
};

document.getElementById('sb-wifi').onclick = function(e) { e.stopPropagation(); document.getElementById('sb-wifi-popover').classList.toggle('hidden'); };
document.getElementById('sb-battery').onclick = function(e) { e.stopPropagation(); document.getElementById('sb-battery-popover').classList.toggle('hidden'); };
document.getElementById('sb-clock').onclick = function(e) { e.stopPropagation(); document.getElementById('sb-clock-popover').classList.toggle('hidden'); };

document.addEventListener('contextmenu', function(e) {
  if (e.target.closest('.icon') || e.target.closest('.window')) return;
  e.preventDefault();
  contextMenu.style.left = e.clientX + 'px';
  contextMenu.style.top = e.clientY + 'px';
  contextMenu.classList.remove('hidden');
});

document.querySelectorAll('.ctx-item').forEach(function(item) {
  item.onclick = function() {
    var action = item.dataset.action;
    if (action === 'refresh') location.reload();
    else if (action === 'arrange') {
      desktopIcons.classList.remove('freeform');
      desktopIcons.querySelectorAll('.icon').forEach(function(i) { i.style.left = ''; i.style.top = ''; });
      saveState('iconLayout', {});
    }
    else if (action === 'wallpaper') {
      settingsState.wallpaper = (settingsState.wallpaper + 1) % WALLPAPERS.length;
      saveSettings(); applyWallpaper();
      showUpgradeNotification('Wallpaper: ' + WALLPAPERS[settingsState.wallpaper].name);
    }
    else if (action === 'about') alert('FreeOs - A web desktop experience');
    contextMenu.classList.add('hidden');
  };
});

function applySavedIconLayout() {
  var layout = loadState('iconLayout', {});
  var ids = Object.keys(layout);
  if (!ids.length) return;
  desktopIcons.classList.add('freeform');
  ids.forEach(function(appId) {
    var icon = desktopIcons.querySelector('.icon[data-app="' + appId + '"]');
    if (!icon) return;
    icon.style.left = layout[appId].left + 'px';
    icon.style.top = layout[appId].top + 'px';
  });
}

desktopIcons.addEventListener('mousedown', function(e) {
  var icon = e.target.closest('.icon');
  if (!icon) return;
  var rect = desktopIcons.getBoundingClientRect();
  var iconRect = icon.getBoundingClientRect();
  iconDragState = {
    icon: icon,
    startX: e.clientX, startY: e.clientY,
    offsetX: e.clientX - iconRect.left, offsetY: e.clientY - iconRect.top,
    containerRect: rect, // nepouziva se ale nechavam
    moved: false,
    ghost: null
  };
});

document.addEventListener('mousemove', function(e) {
  if (!iconDragState) return;
  var dx = e.clientX - iconDragState.startX;
  var dy = e.clientY - iconDragState.startY;
  // ghost vytvorim az po par px aby klik neprepsal drag
  if (!iconDragState.moved && Math.hypot(dx, dy) > 4) {
    iconDragState.moved = true;
    iconDragState.ghost = iconDragState.icon.cloneNode(true);
    iconDragState.ghost.classList.add('icon-ghost');
    document.body.appendChild(iconDragState.ghost);
    iconDragState.icon.classList.add('dragging');
  }
});

document.addEventListener('mouseup', function(e) {
  if (iconDragState) {
    if (iconDragState.moved) {
      var desktopRect = desktop.getBoundingClientRect();
      var left = e.clientX - desktopRect.left - iconDragState.offsetX;
      var top = e.clientY - desktopRect.top - iconDragState.offsetY;
      // drzet v okne
      left = Math.max(0, Math.min(left, desktopRect.width - iconDragState.icon.offsetWidth));
      top = Math.max(0, Math.min(top, desktopRect.height - iconDragState.icon.offsetHeight - 60));
      desktopIcons.classList.add('freeform');
      iconDragState.icon.style.left = left + 'px';
      iconDragState.icon.style.top = top + 'px';
      var layout = loadIconLayout();
      layout[iconDragState.icon.dataset.app] = { left: left, top: top };
      saveIconLayout(layout);
    }
    if (iconDragState.ghost) iconDragState.ghost.remove();
    iconDragState.icon.classList.remove('dragging');
    iconDragState = null;
  }
});

// TODO: na mobilu touch eventy (ted jen mouse)
// cas jako v jam tutorialu (nic fancy)
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleString();
  document.getElementById('date-display').textContent = new Date().toLocaleDateString();
}
setInterval(updateClock, 1000);
updateClock();

function initSpotlight() {
  var appsList = Object.entries(apps).map(function(entry) { return { id: entry[0], title: entry[1].title }; });
  spotlightInput.addEventListener('input', function() {
    var q = spotlightInput.value.toLowerCase();
    spotlightResults.innerHTML = '';
    appsList.filter(function(a) { return a.title.toLowerCase().includes(q); }).forEach(function(a) {
      var item = document.createElement('div');
      item.className = 'spotlight-item';
      item.innerHTML = a.title;
      item.onclick = function() { openApp(a.id); closeSpotlight(); };
      spotlightResults.appendChild(item);
    });
    if (!spotlightResults.children.length) {
      spotlightResults.innerHTML = '<div class="spotlight-empty">No apps found</div>';
    }
  });
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toggleSpotlight();
    }
  });
}

function toggleSpotlight() {
  var hidden = spotlightOverlay.classList.toggle('hidden');
  if (!hidden) {
    spotlightInput.value = '';
    spotlightInput.focus();
    spotlightInput.dispatchEvent(new Event('input'));
  }
}
function closeSpotlight() { spotlightOverlay.classList.add('hidden'); }

// ---- init ----
// uvodni obrazovka
var welcome = document.getElementById('welcome');
welcome.addEventListener('click', function() {
  welcome.style.display = 'none';
  console.log('vitej na mym osu :)');
});

document.documentElement.style.setProperty('--accent', settingsState.accent);
if (!settingsState.animations) document.documentElement.classList.add('no-anim');
applyGlassSetting();
applyWallpaper();
initSpotlight();
applySavedIconLayout();
