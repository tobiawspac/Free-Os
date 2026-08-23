# Free-Os

A personal web-based operating system you can open in any browser. Click anywhere on the welcome screen to enter — no login, no password, anyone can play with it.

Live at: https://freeos.boteda429.workers.dev

## What's inside

- Multiple **draggable, resizable windows** you can open, minimize, maximize, snap to the left/right half, and close.
- Desktop icons you can **drag around** and rearrange freely.
- Apps: About Me (notepad), Calculator, Settings (accent color, glass, wallpaper), Console, Browser, and **Snake**.
- **Control Center** (Wi‑Fi / DND / Glass / Animations toggles) and a volume slider.
- **Spotlight search** — press `Ctrl/Cmd + K` and type to launch apps.
- **Clock, battery and Wi‑Fi popovers** in the status bar.

## New feature (not in the guide)

The **Snake game** is a fully playable app running inside its own draggable window.
It uses a `<canvas>`, a game loop, food spawning, collision detection and a score
counter — none of which the basic webOS guide covers. Open "Snake" from the desktop
and steer with the arrow keys or WASD. Each snake window is independent, so you can
even run several at once.

## Devlogs

### Devlog 1 — Bootscreen & draggable windows
Started with the welcome screen and a single window skeleton. Got windows to open,
drag by the titlebar, and close. The trickiest part was keeping the drag math inside
the viewport with `clampPosition()` so windows can't be lost off-screen.

### Devlog 2 — Desktop, apps & taskbar
Added desktop icons that open apps, a taskbar showing running apps, and the minimize/
maximize flow. I also built Settings (accent color, glass effect, wallpaper switcher)
and persisted everything to `localStorage` so the OS remembers your setup.

### Devlog 3 — Spotlight, Control Center & the Snake game
Added `Ctrl/Cmd + K` Spotlight search and a Control Center with quick toggles. Then
I added my own **Snake** game as a windowed app — a canvas game loop with food,
growth and collision, gated so keyboard input only controls the active snake window.
Finally moved the site into `public/` and deployed with `wrangler` (Cloudflare Workers
static assets) so anyone can open it without a password.

## Usage

Open `index.html` in a browser, or visit the live link above.
