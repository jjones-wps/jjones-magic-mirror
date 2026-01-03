# E2E Testing Quick Start Guide

This guide provides quick commands for running E2E tests using Chrome DevTools MCP.

## Prerequisites

1. **Chrome with Remote Debugging** (Windows PowerShell):
```powershell
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue

& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
    --user-data-dir="$env:USERPROFILE\ChromeProfiles\mcp" `
    --remote-debugging-port=9222 `
    --remote-debugging-address=127.0.0.1 `
    --no-first-run `
    --no-default-browser-check
```

2. **Dev Server Running:**
```bash
npm run dev
```

3. **Verify Chrome DevTools Connection** (WSL2):
```bash
curl http://localhost:9222/json | jq
```

## Manual Testing Workflow

### 1. Performance Audit

Navigate to page and run trace:

```javascript
// Via Claude Code with Chrome DevTools MCP
mcp__chrome-devtools__navigate_page({ type: "url", url: "http://localhost:3000/admin" })
mcp__chrome-devtools__performance_start_trace({ reload: true, autoStop: true })
```

**Metrics to Check:**
- LCP < 2500ms (current: 677ms ✅)
- CLS < 0.1 (current: 0.08 ✅)
- TTFB < 800ms (current: 39ms ✅)

### 2. Console Error Detection

```javascript
mcp__chrome-devtools__list_console_messages({ pageSize: 20 })
```

**Expected Output:**
- `[log] [VersionChecker] Initial build: ...`
- `[log] [HMR] connected`

**Red Flags:**
- Any `[error]` messages
- Any `[warn]` messages (except form field id/name)

### 3. Network Monitoring

```javascript
mcp__chrome-devtools__list_network_requests({
  resourceTypes: ["fetch", "xhr"],
  pageSize: 20
})
```

**Expected:**
- All API calls: 200 status
- No 404, 500, or timeout errors

### 4. Widget Data Verification

Navigate to mirror display:

```javascript
mcp__chrome-devtools__navigate_page({ type: "url", url: "http://localhost:3000/" })
mcp__chrome-devtools__wait_for({ text: "Fort Wayne", timeout: 10000 })
mcp__chrome-devtools__take_snapshot()
```

**Verify in snapshot:**
- Clock showing current time
- Weather showing temperature
- Calendar showing events (if any)
- Commute times displayed
- News headlines visible

## Automated Testing Checklist

### Pre-Deployment Validation

- [ ] All admin pages load without errors
- [ ] Mirror display renders all widgets
- [ ] Performance metrics within targets
- [ ] Zero console errors
- [ ] All API calls successful (200 OK)

### Performance Regression Check

Run before and after changes:

```bash
# Baseline measurement
npm run build
npm run start &
# Wait for server
curl http://localhost:3000/api/version

# Run performance audit (via Claude Code)
# Document LCP, CLS, TTFB

# After changes, compare metrics
# Acceptable variance: ±10%
```

### Visual Regression Check

```bash
# Capture baseline
mcp__chrome-devtools__take_screenshot({
  format: "png",
  filePath: "docs/baselines/mirror-$(date +%Y%m%d).png"
})

# After changes, compare visually
# Use image diff tool or manual inspection
```

## Common Testing Scenarios

### Scenario 1: Test New Widget

1. Navigate to mirror display
2. Verify widget renders
3. Check console for errors
4. Verify API call succeeds
5. Capture screenshot

### Scenario 2: Test Admin Form

1. Navigate to admin page
2. Verify form loads
3. Check for accessibility warnings
4. Test form validation (manual)
5. **Note:** Form submission requires Playwright

### Scenario 3: Test Performance Impact

1. Baseline: Run performance trace
2. Make changes
3. Rebuild and restart
4. Compare: Run performance trace
5. Ensure LCP/CLS within ±10%

## Troubleshooting

### Issue: Chrome DevTools not connecting

```bash
# Check if Chrome is running with remote debugging
curl http://localhost:9222/json

# Verify port proxy (Windows PowerShell as Administrator)
netsh interface portproxy show all

# Check firewall rule
Get-NetFirewallRule -DisplayName "Chrome DevTools WSL"
```

### Issue: API calls returning 401 Unauthorized

**Cause:** API requires authentication (redirects to `/admin/login`)

**Solution:** Test with authenticated browser session (Chrome DevTools uses live browser)

### Issue: Form interactions not working

**Expected Behavior:** Chrome DevTools `click()` times out on React forms

**Solution:** Use Playwright for form testing (see E2E_TESTING_REPORT.md)

## Next Steps

For comprehensive E2E testing with form submissions, implement Playwright:

```bash
npm install -D @playwright/test

# Create test
cat > src/__tests__/e2e/admin-settings.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test('AI Behavior settings persist', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/ai-behavior');

  await page.getByRole('slider', { name: 'Temperature' }).fill('0.7');
  await page.getByRole('button', { name: 'Save Settings' }).click();
  await expect(page.getByText('Settings saved')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('slider', { name: 'Temperature' })).toHaveValue('0.7');
});
EOF

# Run test
npx playwright test
```

## Reference Documentation

- **Full Report:** `docs/E2E_TESTING_REPORT.md`
- **Performance Audit:** `docs/PERFORMANCE_AUDIT_2026-01-03.md`
- **Chrome DevTools Setup:** `~/.claude/CLAUDE.md` (lines 249-601)

---

**Last Updated:** January 3, 2026
**Maintained By:** Development Team
