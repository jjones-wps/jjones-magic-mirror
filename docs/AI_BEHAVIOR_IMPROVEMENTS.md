# AI Behavior Feature Improvements

**Status:** In Progress
**Created:** January 3, 2026
**Last Updated:** January 3, 2026
**Priority:** Mixed (CI fix critical, enhancements low priority)

This document outlines improvements identified during code review of PR #10 and subsequent CI/CD deployment issues.

---

## Critical Fixes (Completed)

### ✅ CI Test Failure - Missing Prisma $transaction Mock

**Issue:** After merging PR #10, CI pipeline failed with test error:

```
FAIL src/__tests__/api/admin/ai-behavior.test.ts
  ● PUT /api/admin/ai-behavior › should update settings successfully
    Expected: 200
    Received: 500
```

**Root Cause:**

- PR #10 wrapped database operations in `prisma.$transaction([])` for atomicity
- Test file mocked individual Prisma methods (`upsert`, `create`) but not `$transaction`
- When PUT route called `prisma.$transaction(operations)`, it was `undefined` → 500 error

**Solution:**

```typescript
// BEFORE (Missing $transaction):
jest.mock('@/lib/db', () => ({
  prisma: {
    setting: { findMany: jest.fn(), upsert: jest.fn() },
    activityLog: { create: jest.fn() },
    configVersion: { upsert: jest.fn() },
  },
}));

// AFTER (Fixed with $transaction):
jest.mock('@/lib/db', () => ({
  prisma: {
    setting: { findMany: jest.fn(), upsert: jest.fn() },
    activityLog: { create: jest.fn() },
    configVersion: { upsert: jest.fn() },
    $transaction: jest.fn((operations) => Promise.all(operations)),
  },
}));
```

**Files Modified:**

- `src/__tests__/api/admin/ai-behavior.test.ts` (line 23)

**Result:** All 14 tests passing locally, ready for CI re-run

---

### ✅ Build Failure - Client Component Importing Prisma Code

**Issue:** After test fix, build failed with:

```
Error: Turbopack build failed with 3 errors:
./node_modules/better-sqlite3/lib/database.js:2:12
Module not found: Can't resolve 'fs'

Import trace:
  Client Component Browser:
    ./src/lib/db.ts [Client Component Browser]
    ./src/lib/ai-behavior.ts [Client Component Browser]
    ./src/app/admin/ai-behavior/page.tsx [Client Component Browser]
```

**Root Cause:**

- Admin page (`src/app/admin/ai-behavior/page.tsx`) is a client component with `'use client'` directive
- Client components cannot import server-only code (Prisma, Node.js modules)
- After extracting `fetchAIBehaviorSettings()` to shared `ai-behavior.ts`, it included `import { prisma }` at the top
- Next.js attempted to bundle Prisma + better-sqlite3 (native Node.js module) into browser bundle
- better-sqlite3 requires Node.js `fs` module → build fails

**Solution:**
Split into client-safe and server-only modules with proper Next.js directives:

```typescript
// src/lib/ai-behavior.ts (CLIENT-SAFE)
// - Types and constants only
// - No Prisma imports
// - Can be imported by client components

export interface AIBehaviorSettings {
  /* ... */
}
export const DEFAULT_AI_BEHAVIOR = {
  /* ... */
};

// src/lib/ai-behavior.server.ts (SERVER-ONLY - NEW FILE)
import 'server-only'; // Next.js directive prevents client import
import { prisma } from '@/lib/db';
import { DEFAULT_AI_BEHAVIOR, type AIBehaviorSettings } from './ai-behavior';

export async function fetchAIBehaviorSettings(): Promise<AIBehaviorSettings> {
  // Database operations with Prisma
}
```

**Files Modified:**

- `src/lib/ai-behavior.ts` - Removed Prisma import and `fetchAIBehaviorSettings()`
- `src/lib/ai-behavior.server.ts` - **NEW** server-only module with `'server-only'` directive
- `src/app/api/admin/ai-behavior/route.ts` - Changed import to `.server` module
- `src/app/api/summary/route.ts` - Changed import to `.server` module

**Result:** Build succeeded, deployment to Pi completed successfully (4m 7s)

---

## Priority Matrix (Optional Enhancements)

| Priority  | Item                                      | Effort | Impact | Risk   |
| --------- | ----------------------------------------- | ------ | ------ | ------ |
| 🟡 Medium | Integration tests for boolean persistence | 1-2h   | High   | Low    |
| 🟡 Medium | Type assertions for JSON.parse            | 30min  | Medium | Low    |
| 🟢 Low    | Zod validation migration                  | 2-3h   | Medium | Medium |
| 🟢 Low    | Response caching (5-min TTL)              | 1h     | Medium | Low    |
| 🟢 Low    | Make commute baseline configurable        | 1h     | Low    | Low    |
| 🟢 Low    | Add frequency penalty to settings         | 1.5h   | Low    | Low    |

**Total Estimated Effort:** 7-10 hours
**Recommended Approach:** Split into 2-3 PRs based on priority

---

## Enhancement 1: Type Assertions for JSON.parse

### Current Implementation

```typescript
// src/lib/ai-behavior.ts:95-121
userNames: settingsMap.userNames && settingsMap.userNames !== ''
  ? JSON.parse(settingsMap.userNames)
  : [],

stopSequences: settingsMap.stopSequences && settingsMap.stopSequences !== ''
  ? JSON.parse(settingsMap.stopSequences)
  : [],
```

### Proposed Change

```typescript
userNames: settingsMap.userNames && settingsMap.userNames !== ''
  ? (JSON.parse(settingsMap.userNames) as string[])
  : [],

stopSequences: settingsMap.stopSequences && settingsMap.stopSequences !== ''
  ? (JSON.parse(settingsMap.stopSequences) as string[])
  : [],
```

### Benefits

- **Type Safety:** Explicit type annotation makes intent clear
- **IDE Support:** Better autocomplete and error detection
- **Maintainability:** Easier to understand expected types

### Risk Assessment

- **Low Risk:** Type assertions don't change runtime behavior
- **No Breaking Changes:** Backward compatible

### Files to Modify

- `src/lib/ai-behavior.ts` (2 locations)

---

## Enhancement 2: Zod Validation Migration

### Current Implementation

```typescript
// src/app/api/admin/ai-behavior/route.ts:46-101
const validationErrors: string[] = [];

if (typeof body.temperature !== 'number' || body.temperature < 0 || body.temperature > 2) {
  validationErrors.push('Temperature must be between 0 and 2');
}
// ... 8 more manual validations
```

### Proposed Change

```typescript
import { z } from 'zod';

const AIBehaviorSchema = z.object({
  // Model & Output Parameters
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().min(50).max(300),
  topP: z.number().min(0).max(1),
  presencePenalty: z.number().min(-2).max(2),
  verbosity: z.enum(['low', 'medium', 'high']),

  // Tone & Personalization
  tone: z.enum(['formal', 'casual']),
  userNames: z.array(z.string()).default([]),
  humorLevel: z.enum(['none', 'subtle', 'playful']),
  customInstructions: z.string().default(''),

  // Context-Aware Intelligence
  morningTone: z.enum(['energizing', 'neutral', 'custom']),
  eveningTone: z.enum(['calming', 'neutral', 'custom']),
  stressAwareEnabled: z.boolean(),
  celebrationModeEnabled: z.boolean(),

  // Advanced Controls
  stopSequences: z.array(z.string()).default([]),
});

export type AIBehaviorSettings = z.infer<typeof AIBehaviorSchema>;

// In PUT route:
const result = AIBehaviorSchema.safeParse(body);
if (!result.success) {
  return NextResponse.json({ error: result.error.flatten().fieldErrors }, { status: 400 });
}
```

### Benefits

- **Consistency:** Project already uses Zod elsewhere
- **Type Inference:** Single source of truth for types
- **Better Errors:** Structured error messages
- **Less Code:** 15 validation rules → 1 schema

### Risk Assessment

- **Medium Risk:** Replaces working validation logic
- **Breaking Change:** Error message format changes
- **Mitigation:** Thorough testing, staged rollout

### Files to Modify

- `src/lib/ai-behavior.ts` - Export schema
- `src/app/api/admin/ai-behavior/route.ts` - Use schema for validation

### Testing Required

- Unit tests for all 15 validation rules
- Integration tests for error responses
- Frontend compatibility (error message display)

---

## Enhancement 3: Integration Tests for Boolean Persistence

### Current Gap

Unit tests verify API logic, but no end-to-end test confirms:

1. User saves `stressAwareEnabled: false`
2. Database stores `'false'` string
3. Reload fetches and parses as boolean `false`
4. UI displays unchecked checkbox

### Proposed Tests

**File:** `src/__tests__/integration/ai-behavior-persistence.test.tsx`

```typescript
describe('AI Behavior Boolean Persistence', () => {
  it('should persist false values through save/load cycle', async () => {
    // 1. Save settings with false values
    const settings = {
      ...DEFAULT_AI_BEHAVIOR,
      stressAwareEnabled: false,
      celebrationModeEnabled: false,
    };

    await fetch('/api/admin/ai-behavior', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });

    // 2. Fetch settings
    const response = await fetch('/api/admin/ai-behavior');
    const loaded = await response.json();

    // 3. Verify booleans are still false
    expect(loaded.stressAwareEnabled).toBe(false);
    expect(loaded.celebrationModeEnabled).toBe(false);
  });

  it('should display unchecked checkboxes for false values', async () => {
    const user = userEvent.setup();
    render(<AIBehaviorPage />);

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByLabelText(/stress aware/i)).toBeInTheDocument();
    });

    // Verify checkboxes are unchecked
    const stressCheckbox = screen.getByLabelText(/stress aware/i);
    expect(stressCheckbox).not.toBeChecked();
  });

  it('should save false when user unchecks checkbox', async () => {
    const user = userEvent.setup();
    render(<AIBehaviorPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/celebration mode/i)).toBeInTheDocument();
    });

    // Uncheck checkbox
    const checkbox = screen.getByLabelText(/celebration mode/i);
    await user.click(checkbox);

    // Save settings
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Verify API received false
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/ai-behavior',
        expect.objectContaining({
          body: expect.stringContaining('"celebrationModeEnabled":false'),
        })
      );
    });
  });
});
```

### Benefits

- **Regression Prevention:** Ensures boolean bug stays fixed
- **UI Verification:** Tests full user flow
- **Documentation:** Tests serve as examples

### Files to Create

- `src/__tests__/integration/ai-behavior-persistence.test.tsx`

---

## Enhancement 4: Response Caching (5-Minute TTL)

### Current Behavior

Every `/api/summary` request fetches AI behavior settings from database:

- 6 requests/minute (summary refreshes every 10s in dev)
- 2 requests/minute (30s in production)
- ~120 DB queries/hour in production

### Proposed Implementation

**File:** `src/lib/ai-behavior.ts`

```typescript
// Simple in-memory cache
let cachedSettings: AIBehaviorSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchAIBehaviorSettings(
  bypassCache: boolean = false
): Promise<AIBehaviorSettings> {
  const now = Date.now();

  // Return cached settings if valid
  if (!bypassCache && cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings;
  }

  // Fetch from database
  const settings = await prisma.setting.findMany({
    where: { category: 'ai-behavior' },
  });

  // ... existing parsing logic ...

  // Update cache
  cachedSettings = response;
  cacheTimestamp = now;

  return response;
}

// Cache invalidation on save
export function invalidateAIBehaviorCache() {
  cachedSettings = null;
  cacheTimestamp = 0;
}
```

**Usage in PUT route:**

```typescript
// After successful save
await prisma.$transaction([...]);
invalidateAIBehaviorCache(); // Clear cache
return NextResponse.json({ success: true });
```

### Benefits

- **Performance:** Reduces DB queries by ~95%
- **Scalability:** Less database load
- **User Experience:** Faster summary generation

### Trade-offs

- **Stale Data:** Up to 5 minutes for changes to take effect
- **Memory Usage:** ~500 bytes cached in memory
- **Multi-Instance:** Cache per server instance (ok for single Pi)

### Alternative: Redis Cache

For production with multiple servers:

```typescript
import { Redis } from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function fetchAIBehaviorSettings(): Promise<AIBehaviorSettings> {
  const cached = await redis.get('ai-behavior-settings');
  if (cached) return JSON.parse(cached);

  const settings = await fetchFromDatabase();
  await redis.set('ai-behavior-settings', JSON.stringify(settings), 'EX', 300);
  return settings;
}
```

### Files to Modify

- `src/lib/ai-behavior.ts` - Add caching logic
- `src/app/api/admin/ai-behavior/route.ts` - Invalidate on save

---

## Enhancement 5: Configurable Commute Baseline

### Current Implementation

```typescript
// src/app/api/summary/route.ts:618
const baselineMinutes = 22; // TODO: Make this configurable or calculated
```

### Proposed Change

**1. Add to AIBehaviorSettings:**

```typescript
export interface AIBehaviorSettings {
  // ... existing fields ...

  // Commute Settings
  commuteBaselineMinutes: number; // Default: 22
}

export const DEFAULT_AI_BEHAVIOR = {
  // ... existing defaults ...
  commuteBaselineMinutes: 22,
};
```

**2. Update Admin UI:**

```tsx
{
  /* Commute Baseline */
}
<div className="form-field">
  <label className="form-label">Commute Baseline: {settings.commuteBaselineMinutes} minutes</label>
  <input
    type="range"
    min="10"
    max="60"
    step="1"
    value={settings.commuteBaselineMinutes}
    onChange={(e) => setSettings({ ...settings, commuteBaselineMinutes: parseInt(e.target.value) })}
    className="form-slider"
  />
  <p className="form-hint">Normal commute time for comparison (used in traffic alerts)</p>
</div>;
```

**3. Use in Summary:**

```typescript
const baselineMinutes = aiBehavior.commuteBaselineMinutes;
const isSignificantDelay = minutes > baselineMinutes * 1.25;
```

### Benefits

- **Personalization:** Users set their own "normal" commute time
- **Accuracy:** Better traffic alerts based on actual baseline
- **Flexibility:** Different baselines for different routes

### Files to Modify

- `src/lib/ai-behavior.ts` - Add field to interface/default
- `src/app/admin/ai-behavior/page.tsx` - Add slider
- `src/app/api/summary/route.ts` - Use dynamic baseline

---

## Enhancement 6: User-Configurable Frequency Penalty

### Current Implementation

```typescript
// src/app/api/summary/route.ts:406
baseParams.frequency_penalty = 1.5; // Hardcoded
```

### Analysis

**Purpose:** Prevents AI from repeating phrases/topics
**Current Value:** 1.5 (moderately high)
**Question:** Should this be configurable or intentionally fixed?

### Option A: Make It Configurable

**Add to AIBehaviorSettings:**

```typescript
export interface AIBehaviorSettings {
  // Model & Output Parameters
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number; // NEW
  verbosity: 'low' | 'medium' | 'high';
  // ...
}

export const DEFAULT_AI_BEHAVIOR = {
  // ...
  frequencyPenalty: 1.5,
};
```

**Update Admin UI:**

```tsx
{
  /* Frequency Penalty */
}
<div className="form-field">
  <label className="form-label">
    Frequency Penalty: {settings.frequencyPenalty.toFixed(1)}
    {isAnthropic && <span className="badge badge-warning ml-2">Not supported by Claude</span>}
  </label>
  <input
    type="range"
    min="-2"
    max="2"
    step="0.1"
    value={settings.frequencyPenalty}
    onChange={(e) => setSettings({ ...settings, frequencyPenalty: parseFloat(e.target.value) })}
    className="form-slider"
    disabled={isAnthropic}
  />
  <p className="form-hint">Discourages repetition of words/phrases</p>
</div>;
```

**Update buildModelParams:**

```typescript
if (isAnthropic) {
  baseParams.temperature = behaviorSettings.temperature;
} else {
  baseParams.temperature = behaviorSettings.temperature;
  baseParams.top_p = behaviorSettings.topP;
  baseParams.presence_penalty = behaviorSettings.presencePenalty;
  baseParams.frequency_penalty = behaviorSettings.frequencyPenalty; // Use setting
}
```

### Option B: Keep It Hardcoded

**Reasoning:**

- Prevents verbose/repetitive summaries
- Most users don't understand this parameter
- Value of 1.5 is well-tested

**Action:** Document in code why it's hardcoded

```typescript
// INTENTIONALLY HARDCODED: frequency_penalty prevents AI from repeating
// phrases, ensuring concise summaries. Value of 1.5 balances variety with
// coherence. Not exposed in UI to avoid user confusion.
baseParams.frequency_penalty = 1.5;
```

### Recommendation

**Option B** - Keep hardcoded unless users specifically request control.

### Files to Modify (if Option A)

- `src/lib/ai-behavior.ts` - Add field
- `src/app/admin/ai-behavior/page.tsx` - Add slider with Anthropic check
- `src/app/api/summary/route.ts` - Use dynamic value

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 hours)

**Target:** Single PR, low risk

- [x] ✅ Type assertions for JSON.parse (30 min)
- [ ] Response caching with 5-min TTL (1 hour)
- [ ] Document frequency penalty decision (5 min)

**Files:** `src/lib/ai-behavior.ts`, `src/app/api/admin/ai-behavior/route.ts`

### Phase 2: Testing (1-2 hours)

**Target:** Single PR, test-only

- [ ] Integration tests for boolean persistence (2 hours)

**Files:** `src/__tests__/integration/ai-behavior-persistence.test.tsx`

### Phase 3: Major Enhancements (4-6 hours)

**Target:** Separate PRs, higher risk

**PR 1: Zod Migration** (2-3 hours)

- [ ] Create Zod schema
- [ ] Update validation logic
- [ ] Update tests
- [ ] Test error messages in UI

**PR 2: Configurable Settings** (2-3 hours)

- [ ] Add commute baseline to settings
- [ ] Add frequency penalty (if Option A)
- [ ] Update admin UI
- [ ] Update summary generation

---

## Testing Strategy

### Unit Tests

- Zod schema validation (all 15+ fields)
- Cache hit/miss behavior
- Cache invalidation on save

### Integration Tests

- Boolean persistence through full cycle
- Cache expiration (5-minute TTL)
- New settings render in UI

### Manual Testing

- Save settings → Wait 6 minutes → Verify cache expired
- Change commute baseline → Verify summary uses new value
- Uncheck boolean → Save → Reload → Verify unchecked

---

## Migration Path

### Phase 1 (Immediate)

1. Create feature branch: `feature/ai-behavior-polish`
2. Implement type assertions
3. Add response caching
4. Document frequency penalty decision
5. Create PR, request review

### Phase 2 (Next Week)

1. Add integration tests
2. Verify no regressions
3. Create PR

### Phase 3 (As Needed)

1. Discuss Zod migration with team
2. Implement if consensus reached
3. Add configurable settings if requested

---

## Risk Mitigation

### Zod Migration Risks

- **Risk:** Breaking change to error message format
- **Mitigation:** Feature flag, A/B test, staged rollout

### Caching Risks

- **Risk:** Stale data for 5 minutes after save
- **Mitigation:** Cache invalidation on PUT, UI shows "Saved" message

### New Settings Risks

- **Risk:** Users misconfigure and break summaries
- **Mitigation:** Sensible defaults, validation, help text

---

## Success Criteria

### Must Have

- [ ] All existing tests pass
- [ ] No regressions in functionality
- [ ] Code coverage maintained (88%+)

### Nice to Have

- [ ] Reduced database queries (95% reduction)
- [ ] Improved type safety (Zod)
- [ ] Better test coverage (integration tests)

---

## Decision Log

### January 3, 2026

- **Decision:** Merge PR #10 without optional enhancements
- **Reasoning:** Production-ready, enhancements can follow
- **Next Steps:** Create improvement plan (this document)

---

## References

- **Original PR:** #10 (AI Behavior Settings)
- **Code Review:** Claude Code (9.7/10) + Greptile (4/5)
- **Related Docs:**
  - `docs/AI_BEHAVIOR_SETTINGS.md`
  - `docs/AI_BEHAVIOR_MODEL_COMPATIBILITY.md`
  - `docs/AUDIT_REPORT.md`
