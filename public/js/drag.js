// tahani oken za titlebar + resizovani rohu + snap do stran
function zmxncb() {

var activeDrag = null;
var activeResize = null;
var snapPrev = document.getElementById('snap-preview');

// 52 = taskbar, 28 = status bar (natvrdo, sry)
window.clampPosition = function(left, top, w, h) {
  return {
    left: Math.max(-w + 60, Math.min(left, window.innerWidth - 60)),
    top: Math.max(28, Math.min(top, window.innerHeight - 52 - 20))
  };
}

function getSnapZone(x) {
  var w = window.innerWidth;
  var h = window.innerHeight - 52;
  var m = 40; // okraj kdy se to chytne
  if (x < m) return { left: '0', top: '28px', width: '50%', height: (h - 28) + 'px' };
  if (x > w - m) return { left: '50%', top: '28px', width: '50%', height: (h - 28) + 'px' };
  return null;
}

function showSnapPreview(x) {
  var zone = getSnapZone(x);
  if (!zone) { snapPrev.classList.add('hidden'); return; }
  Object.assign(snapPrev.style, { left: zone.left, top: zone.top, width: zone.width, height: zone.height });
  snapPrev.classList.remove('hidden');
}

function hideSnapPreview() { snapPrev.classList.add('hidden'); }

function applySnap(win, zone) {
  var w = window.winReg.get(win.dataset.id);
  if (w && w.maximized) {
    w.el.classList.remove('maximized');
    w.maximized = false;
  }
  Object.assign(win.style, { left: zone.left, top: zone.top, width: zone.width, height: zone.height });
}

// navesi na nove okno drag + resize + dblclick maximize
window.setupWindowChrome = function(win) {
  var titlebar = win.querySelector('.window-titlebar');

  titlebar.addEventListener('mousedown', function(e) {
    if (e.target.closest('.window-controls')) return;
    hideSnapPreview();
    document.body.style.cursor = 'grabbing';
    activeDrag = { win: win, startX: e.clientX, startY: e.clientY,
      initLeft: win.offsetLeft, initTop: win.offsetTop, lastX: e.clientX };
  });

  titlebar.addEventListener('dblclick', function(e) {
    if (e.target.closest('.window-controls')) return;
    window.toggleMaximize(win.dataset.id);
  });

  win.querySelectorAll('.resize-handle').forEach(function(h) {
    h.addEventListener('mousedown', function(e) {
      e.stopPropagation();
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

document.addEventListener('mousemove', function(e) {
  if (activeDrag) {
    var pos = window.clampPosition(activeDrag.initLeft + e.clientX - activeDrag.startX,
      activeDrag.initTop + e.clientY - activeDrag.startY,
      activeDrag.win.offsetWidth, activeDrag.win.offsetHeight);
    activeDrag.win.style.left = pos.left + 'px';
    activeDrag.win.style.top = pos.top + 'px';
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
});

document.addEventListener('mouseup', function() {
  if (activeDrag) {
    document.body.style.cursor = '';
    var snap = getSnapZone(activeDrag.lastX);
    if (snap) applySnap(activeDrag.win, snap);
    hideSnapPreview();
    activeDrag = null;
  }
  if (activeResize) activeResize = null;
});

document.addEventListener('mouseleave', function() { hideSnapPreview(); });
}

zmxncb()
