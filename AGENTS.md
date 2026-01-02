# AGENTS.md

Guidelines for AI-powered code review agents (Greptile, Codex, etc.) working with this repository.

## Project Context

This is a Raspberry Pi-powered smart mirror display built with Next.js 16, targeting a 1080x2560 portrait display. Performance and visual consistency are critical.

**Key Documentation:**
- `CLAUDE.md` - Project overview and development workflow
- `docs/DESIGN_SYSTEM.md` - "Quiet Presence" design principles
- `docs/TESTING.md` - Test coverage standards and patterns
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

## Code Review Standards

### 1. Test Coverage (BLOCKING)

**Requirement:** 88.88% overall coverage maintained

**What to check:**
- [ ] Does this PR add untested code?
- [ ] Are new components/functions covered by unit tests?
- [ ] Do tests cover both happy path and edge cases?
- [ ] Are error states tested?

**Current coverage by area:**
- Core widgets: 95-100%
- API routes: 90-95%
- Utilities: 85-90%
- Admin portal: 0% (excluded from coverage requirements)

**What to flag:**
```
❌ BLOCKING: This PR adds 33 lines of new code without corresponding tests.
Required tests:
- Component renders with showTimezone={true}
- Component renders with showTimezone={false}
- Timezone detection works correctly
- Animation timing is correct
```

**Where tests should go:**
- Components: `src/__tests__/components/[ComponentName].test.tsx`
- API routes: `src/__tests__/api/[route-name]/route.test.ts`
- Utilities: `src/__tests__/lib/[utility-name].test.ts`

### 2. Accessibility (REQUIRED)

**What to check:**
- [ ] Are ARIA labels present for dynamic content?
- [ ] Is semantic HTML used (not just divs)?
- [ ] Are screen reader users considered?
- [ ] Does content have sufficient contrast?
- [ ] Are animations respectful of `prefers-reduced-motion`?

**What to flag:**
```
⚠️ ACCESSIBILITY: Timezone text lacks semantic meaning for screen readers.
Recommendation: Add aria-label or wrap in semantic container:

<div role="status" aria-label="Current timezone">
  <span>{timezone}</span>
</div>
```

### 3. Error Handling (REQUIRED)

**What to check:**
- [ ] Are browser APIs wrapped in try/catch?
- [ ] Are network requests error-handled?
- [ ] Are fallback values provided?
- [ ] Are errors logged to console for debugging?

**What to flag:**
```
⚠️ ERROR HANDLING: Intl.DateTimeFormat can fail in some environments.
Recommendation:

try {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  setTimezone(tz);
} catch (error) {
  console.error('Failed to detect timezone:', error);
  setTimezone('UTC'); // Fallback
}
```

### 4. Design System Consistency (REQUIRED)

**References:** `docs/DESIGN_SYSTEM.md`, `src/app/globals.css`, `src/lib/tokens.ts`

**What to check:**
- [ ] Uses only white (#FFFFFF) and black (#000000) - no grays, no colors
- [ ] Opacity hierarchy: hero(1.0), primary(0.87), secondary(0.6), tertiary(0.38)
- [ ] Typography: Syne (display), DM Sans (body), weights 100-500 only
- [ ] Spacing: 8px base unit (mt-2, mt-4, etc.)
- [ ] Animations: GPU-only (transform + opacity), 2-4s breathing rhythms
- [ ] CSS classes: `.text-mirror-*`, `.opacity-*`, `.widget`, etc.

**What to flag:**
```
❌ DESIGN VIOLATION: Using color: #888888 (gray) instead of opacity-based hierarchy.
Use: style={{ opacity: opacity.secondary }} instead of custom colors.
```

### 5. Performance (Raspberry Pi Target)

**What to check:**
- [ ] Only animate `transform` and `opacity` (GPU-accelerated)
- [ ] Avoid backdrop-blur, SVG filters, heavy particle systems
- [ ] No unnecessary re-renders (check useEffect dependencies)
- [ ] Data fetching is cached and throttled appropriately

**Refresh intervals:**
- Clock: 1 second
- Weather: 15 minutes
- Calendar: 5 minutes
- News: 30 minutes
- AI Summary: 30 minutes (2 min in dev)

**What to flag:**
```
⚠️ PERFORMANCE: This animation uses backdrop-filter which is not GPU-accelerated.
Recommendation: Use opacity and transform instead for Raspberry Pi performance.
```

### 6. Animation Timing (IMPORTANT)

**Stagger sequence standards:**
- Initial mount: 0.5s delay increments
- Transitions: 0.3-0.6s duration
- Breathing: 2-4s cycles
- Exit: 0.2-0.3s (faster than entrance)

**Current Clock widget timing:**
- Date: 0.5s delay
- Timezone: 0.6s delay (if shown)
- Feast day: 0.65s delay (if shown)
- Greeting: 0.8s delay

**What to flag:**
```
❓ CLARIFICATION NEEDED: New element uses delay: 0.6s, overlapping with feast day's 0.65s.
Is this intentional (simultaneous appearance) or should timing be adjusted?
```

### 7. TypeScript Best Practices

**What to check:**
- [ ] All props have interfaces
- [ ] No `any` types
- [ ] Return types on functions (when not obvious)
- [ ] Strict null checks handled

**What to flag:**
```
✅ STYLE: Default parameter syntax is redundant.
Current:  export default function Clock({ showTimezone = false }: ClockProps = {})
Suggested: export default function Clock({ showTimezone = false }: ClockProps)

The = {} is unnecessary when destructuring with defaults.
```

### 8. Security (OWASP Top 10)

**What to check:**
- [ ] No secrets in code (use .env.local)
- [ ] Input validation at system boundaries
- [ ] Parameterized queries (if database access)
- [ ] XSS prevention (escape output)
- [ ] CSRF tokens (if forms present)

**What to flag:**
```
🔒 SECURITY: API key exposed in code.
Move to environment variable: process.env.NEXT_PUBLIC_API_KEY
```

### 9. SSR/Hydration Safety (Next.js)

**What to check:**
- [ ] Client-only code in `useEffect`
- [ ] No `window`/`document` access during render
- [ ] State initialized safely (null or empty values)
- [ ] "use client" directive present when needed

**What to flag:**
```
✅ HYDRATION SAFE: Timezone set in useEffect, avoiding SSR mismatch.
State properly initialized as empty string.
```

## Review Template

Use this structure for PR reviews:

```markdown
## Summary
[One sentence: what changed and why]

## Confidence Score: X/5
- 5/5: Safe to merge immediately
- 4/5: Safe to merge with minor suggestions
- 3/5: Needs changes before merge (non-blocking issues)
- 2/5: Needs significant changes (blocking issues)
- 1/5: Major architectural concerns

## Critical Issues (Blocking)
- [ ] Missing test coverage
- [ ] Security vulnerabilities
- [ ] Design system violations
- [ ] Performance regressions

## Important Issues (Should Fix)
- [ ] Accessibility concerns
- [ ] Missing error handling
- [ ] Animation timing conflicts
- [ ] TypeScript improvements

## Nice to Have (Optional)
- [ ] Code style consistency
- [ ] Documentation updates
- [ ] Performance micro-optimizations

## Files Reviewed
| File | Overview |
|------|----------|
| path/to/file.tsx | Brief description of changes |

## Testing Checklist
- [ ] Unit tests added/updated
- [ ] Coverage threshold maintained (88.88%)
- [ ] Manual testing on target display (1080x2560)
- [ ] No hydration mismatches
- [ ] No console errors

## Recommendation
[Approve | Request Changes | Comment]

Estimated effort to address: [X minutes]
```

## Common Pitfalls to Flag

1. **Early returns with loading states instead of LoadingOverlay component**
   ```tsx
   // ❌ Bad
   if (isLoading) return <div>Loading...</div>;

   // ✅ Good
   if (isLoading) return <LoadingOverlay />;
   ```

2. **Hardcoded colors instead of opacity hierarchy**
   ```tsx
   // ❌ Bad
   <div style={{ color: '#888888' }}>Text</div>

   // ✅ Good
   <div style={{ opacity: opacity.secondary }}>Text</div>
   ```

3. **Bold fonts (design system uses max weight 500)**
   ```tsx
   // ❌ Bad
   <span className="font-bold">Text</span>

   // ✅ Good
   <span className="font-medium">Text</span>
   ```

4. **Untested API routes**
   ```typescript
   // Every API route should have:
   // - Success case test
   // - Error case test
   // - Validation test
   // - Caching test (if applicable)
   ```

5. **Missing useEffect dependency arrays**
   ```tsx
   // ❌ Bad
   useEffect(() => {
     doSomething(prop);
   }, []); // Missing 'prop'

   // ✅ Good
   useEffect(() => {
     doSomething(prop);
   }, [prop]);
   ```

## Questions to Ask During Review

1. **Test Coverage:** "Does this PR maintain the 88.88% coverage requirement?"
2. **Accessibility:** "Can screen reader users understand this content?"
3. **Error Handling:** "What happens if this API/browser feature fails?"
4. **Performance:** "Will this run smoothly on a Raspberry Pi?"
5. **Design System:** "Does this follow the 'Quiet Presence' principles?"
6. **Animation:** "Does this timing fit the existing stagger sequence?"
7. **Security:** "Are there any OWASP top 10 vulnerabilities?"
8. **SSR Safety:** "Will this cause hydration mismatches?"

## Integration with Greptile

When Greptile reviews a PR, it should:

1. **Start with context:** Read CLAUDE.md, DESIGN_SYSTEM.md, and TESTING.md
2. **Check blockers first:** Test coverage, security, design violations
3. **Provide actionable feedback:** Code suggestions with diff blocks
4. **Reference standards:** Link to relevant documentation
5. **Estimate effort:** Help developers prioritize fixes
6. **Be constructive:** Focus on teaching, not just flagging

## Customizing Review Behavior

To adjust Greptile's focus, update this file and commit to `main`. Greptile will use it as custom context for all future reviews.

**Example adjustments:**
- Increase/decrease coverage threshold
- Add new animation timing standards
- Define new security rules
- Update review template format

## Version History

- **v1.0 (2026-01-02):** Initial version based on Greptile vs Claude Code A/B testing
  - Addresses test coverage blindspot
  - Adds accessibility requirements
  - Defines error handling standards
  - Clarifies design system rules
  - Provides structured review template
