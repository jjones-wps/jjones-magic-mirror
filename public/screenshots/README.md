# Screenshots Directory

This directory contains screenshots of the Magic Mirror display for documentation purposes.

## Required Screenshots

### 1. Full Mirror Display (`full-mirror-display.png`)
- **Resolution:** 1080x2560 (portrait)
- **Content:** Complete mirror view showing all widgets
- **File size:** < 200KB (optimized)
- **Format:** PNG or JPEG

### 2. Clock Widget (`clock-widget.png`)
- **Content:** Closeup of clock with time, date, and feast day
- **Highlights:** Digit transition animation (if possible)
- **File size:** < 100KB

### 3. Weather Widget (`weather-widget.png`)
- **Content:** Current conditions and hourly forecast
- **File size:** < 100KB

### 4. Calendar Widget (`calendar-widget.png`)
- **Content:** Today's events, tomorrow's events
- **File size:** < 100KB

### 5. AI Summary Widget (`ai-summary-widget.png`)
- **Content:** Daily briefing with greeting
- **File size:** < 100KB

### 6. Spotify Widget (Optional) (`spotify-widget.png`)
- **Content:** Now playing display with album art
- **File size:** < 100KB

### 7. Commute Widget (Optional) (`commute-widget.png`)
- **Content:** Traffic-aware commute times
- **File size:** < 100KB

## How to Capture Screenshots

### On Raspberry Pi

**Option 1: Using scrot (recommended)**
```bash
# Install scrot if not already installed
sudo apt-get install scrot

# Take full screen screenshot
scrot full-mirror-display.png

# Take screenshot after 5 second delay (useful for animations)
scrot -d 5 full-mirror-display.png

# Save to this directory
scrot ~/magic-mirror/public/screenshots/full-mirror-display.png
```

**Option 2: Using Firefox screenshot tool**
1. Press `F11` to exit kiosk mode
2. Press `F12` to open DevTools
3. Click the camera icon (screenshot tool)
4. Select "Save full page" or "Save visible"

**Option 3: Using GNOME Screenshot (if GUI available)**
```bash
gnome-screenshot
```

### Image Optimization

After capturing, optimize images to reduce file size:

```bash
# Install ImageMagick if needed
sudo apt-get install imagemagick

# Optimize PNG (reduce to 80% quality, resize if needed)
convert full-mirror-display.png -quality 80 -resize 1080x2560 full-mirror-display-optimized.png

# Convert to JPEG if PNG is too large
convert full-mirror-display.png -quality 85 full-mirror-display.jpg
```

**Target file sizes:**
- Full display: < 200KB
- Widget closeups: < 100KB each

## Alt Text Guidelines

When adding to README.md, use descriptive alt text:

```markdown
![Magic Mirror full display showing time, weather, calendar, and news widgets](public/screenshots/full-mirror-display.png)
```

## Image Naming Conventions

- Use lowercase with hyphens: `widget-name.png`
- Be descriptive: `full-mirror-display.png` not `screenshot1.png`
- Include variant info: `clock-widget-animation.png`

---

**Note:** Screenshots should be taken in production mode with real data (or representative demo data).
