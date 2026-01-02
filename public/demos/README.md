# Demos Directory

This directory contains animated GIF demos showcasing key features and animations of the Magic Mirror.

## Required GIF Demos

### 1. Clock Digit Transitions (`clock-transition.gif`)
- **Duration:** 5-10 seconds
- **Content:** Show the "Waterfall of Time" animation as minutes/hours change
- **Frame rate:** 30-60 fps (smooth)
- **File size:** < 1MB
- **Loop:** Yes (infinite)

**Recommended timing:**
- Wait for minute to change (e.g., 10:59 → 11:00)
- Start recording 2 seconds before
- Record for 5 seconds after transition

### 2. Calendar Event Transitions (`calendar-events.gif`)
- **Duration:** 8-12 seconds
- **Content:** Show how events fade in/out and transition between today/tomorrow
- **Frame rate:** 30 fps
- **File size:** < 1MB
- **Loop:** Yes

**Recommended approach:**
- Show multiple events with stagger animation
- Capture the fade-in effect

### 3. Auto-Refresh on Deploy (`auto-refresh.gif`)
- **Duration:** 10-15 seconds
- **Content:** Show the "Updating..." indicator and page refresh after deployment
- **Frame rate:** 30 fps
- **File size:** < 1.5MB
- **Loop:** No (one-time demonstration)

**Steps to record:**
1. Have mirror running in one window
2. Push a change to main branch
3. Wait for GitHub Actions to complete (~3-4 minutes)
4. Start recording when "Updating..." appears
5. Show the smooth refresh

### 4. Weather Widget Update (Optional) (`weather-update.gif`)
- **Duration:** 5-8 seconds
- **Content:** Show weather data updating with fade transition
- **Frame rate:** 30 fps
- **File size:** < 1MB

## How to Create GIF Demos

### On Raspberry Pi

**Option 1: Using Peek (recommended for Linux)**
```bash
# Install Peek
sudo apt-get install peek

# Run Peek
peek

# Instructions:
# 1. Click "Record" button
# 2. Adjust recording area (select widget or full screen)
# 3. Click "Start" to begin recording
# 4. Perform the action (wait for animation)
# 5. Click "Stop" when done
# 6. Save as GIF with optimization
```

**Option 2: Using byzanz**
```bash
# Install byzanz
sudo apt-get install byzanz

# Record 10 seconds of screen to GIF
byzanz-record --duration=10 --x=0 --y=0 --width=1080 --height=2560 clock-transition.gif

# Record with 3 second delay (for setup)
byzanz-record --duration=10 --delay=3 --x=0 --y=0 --width=1080 --height=2560 output.gif
```

**Option 3: Using ffmpeg (convert from video)**
```bash
# Record video first using built-in tools or ffmpeg
# Then convert to GIF

# Convert MP4 to GIF
ffmpeg -i recording.mp4 -vf "fps=30,scale=1080:-1:flags=lanczos" -c:v gif clock-transition.gif

# Optimize GIF file size
ffmpeg -i input.gif -vf "fps=30,scale=1080:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" output.gif
```

### On Desktop (Remote Development)

**Windows/Mac/Linux: Using ScreenToGif**
1. Download from [screentogif.com](https://www.screentogif.com/)
2. Open ScreenToGif
3. Select "Recorder"
4. Position window over browser showing mirror (via http://192.168.1.213:3000)
5. Click "Record"
6. Perform action (wait for animation)
7. Click "Stop"
8. Use built-in editor to:
   - Trim frames
   - Optimize file size
   - Reduce frame rate if needed
9. Export as GIF

**Mac: Using LICEcap**
1. Download from [licecap.en.softonic.com](https://licecap.en.softonic.com/mac)
2. Similar process to ScreenToGif

## GIF Optimization

### Reduce File Size

```bash
# Using gifsicle (install: sudo apt-get install gifsicle)
gifsicle -O3 --colors 256 input.gif -o output.gif

# Reduce colors for smaller size (sacrifice quality)
gifsicle -O3 --colors 128 input.gif -o output.gif

# Further optimization with lossy compression
gifsicle -O3 --lossy=80 --colors 256 input.gif -o output.gif
```

### Resize GIF

```bash
# Reduce resolution by 50%
gifsicle --scale 0.5 input.gif -o output.gif

# Set specific width (maintain aspect ratio)
ffmpeg -i input.gif -vf "scale=540:-1:flags=lanczos" output.gif
```

### Target Specifications

| Demo | Max Duration | Max Size | Min FPS | Max FPS |
|------|--------------|----------|---------|---------|
| Clock Transition | 10s | 1MB | 30 | 60 |
| Calendar Events | 12s | 1MB | 24 | 30 |
| Auto-Refresh | 15s | 1.5MB | 24 | 30 |
| Weather Update | 8s | 1MB | 24 | 30 |

**Key Principles:**
- **Smooth animations**: Minimum 24 fps, ideally 30 fps
- **Small file sizes**: GitHub renders GIFs quickly
- **Short duration**: Focus on one specific feature
- **Looping**: Most GIFs should loop seamlessly

## File Naming Conventions

- Use lowercase with hyphens: `feature-name.gif`
- Be descriptive: `clock-transition.gif` not `demo1.gif`
- Include variant info if needed: `clock-transition-60fps.gif`

## Testing GIFs

Before committing:

1. **File size**: Check < 1MB (< 1.5MB for auto-refresh)
   ```bash
   ls -lh *.gif
   ```

2. **Dimensions**: Verify appropriate resolution
   ```bash
   identify clock-transition.gif
   # Should show: clock-transition.gif GIF 1080x2560
   ```

3. **Frame rate**: Check FPS
   ```bash
   ffprobe clock-transition.gif
   ```

4. **Preview**: Open in browser to verify quality
   ```bash
   xdg-open clock-transition.gif  # Linux
   open clock-transition.gif      # Mac
   ```

---

**Note:** GIFs should demonstrate the actual production behavior with smooth animations showcasing the design system's principles.
