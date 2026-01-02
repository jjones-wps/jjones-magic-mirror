# Contributing to Magic Mirror

Thank you for your interest in contributing to the Magic Mirror project! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Review Checklist](#code-review-checklist)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Design System Guidelines](#design-system-guidelines)
- [Good First Issues](#good-first-issues)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **npm** (included with Node.js)
- **Git**

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/jjones-magic-mirror.git
   cd jjones-magic-mirror
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/jjones-wps/jjones-magic-mirror.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys (see README.md)
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000) in your browser

### Documentation

Before contributing, please familiarize yourself with:

- **[README.md](README.md)** - Project overview and setup
- **[docs/README.md](docs/README.md)** - Documentation hub
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture
- **[docs/design/DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md)** - UI/UX guidelines
- **[CLAUDE.md](CLAUDE.md)** - AI-assisted development guidance

---

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

**Branch Naming Conventions:**

- `feature/` - New features (e.g., `feature/moon-phase-widget`)
- `fix/` - Bug fixes (e.g., `fix/weather-api-timeout`)
- `docs/` - Documentation changes (e.g., `docs/update-contributing`)
- `refactor/` - Code refactoring (e.g., `refactor/simplify-calendar-logic`)
- `test/` - Test additions or fixes (e.g., `test/add-commute-tests`)

### 2. Make Your Changes

- Follow the existing code style and patterns
- Add tests for new functionality (target: 85%+ coverage)
- Update documentation if needed
- Run linting and formatting:
  ```bash
  npm run lint        # Check for linting errors
  npm run format      # Auto-format code with Prettier
  ```

### 3. Test Your Changes

```bash
npm run test              # Run all tests
npm run test:coverage     # Check coverage
npm run build             # Ensure build succeeds
```

**All tests must pass before submitting a PR.**

### 4. Keep Your Branch Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push Your Changes

```bash
git push origin feature/your-feature-name
```

### 6. Open a Pull Request

- Go to the GitHub repository
- Click "New Pull Request"
- Select your branch
- Fill out the PR template (see [Pull Request Process](#pull-request-process))

---

## Commit Message Guidelines

We follow **[Conventional Commits](https://www.conventionalcommits.org/)** for clear and semantic commit messages.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, no logic changes)
- `refactor` - Code refactoring (no feature or bug fix)
- `test` - Adding or updating tests
- `chore` - Maintenance tasks (dependencies, build config)
- `perf` - Performance improvements

### Scope (Optional)

The section of codebase affected:

- `weather` - Weather widget or API
- `calendar` - Calendar widget or API
- `commute` - Commute widget or API
- `spotify` - Spotify integration
- `news` - News widget or API
- `ai-summary` - AI summary widget or API
- `admin` - Admin portal
- `design` - Design system changes
- `ci` - CI/CD pipeline changes

### Examples

**Good:**
```
feat(weather): add UV index display

Added UV index to weather widget with color-coded severity levels.
Fetches data from Open-Meteo API and displays alongside temperature.

Closes #42
```

**Good:**
```
fix(calendar): handle all-day events correctly

All-day events now display without time stamps.
Fixed timezone conversion issue causing date shifts.
```

**Good:**
```
docs: update API documentation for commute endpoint

Added request/response examples and error codes.
Clarified TomTom API integration details.
```

**Bad:**
```
fixed stuff
```

**Bad:**
```
Update code
```

---

## Pull Request Process

### PR Checklist

Before submitting, ensure:

- [ ] **Tests pass**: `npm run test` succeeds
- [ ] **Build succeeds**: `npm run build` completes without errors
- [ ] **Linting passes**: `npm run lint` shows no errors
- [ ] **Formatting applied**: `npm run format` has been run
- [ ] **Coverage maintained**: Code coverage stays at or above 85%
- [ ] **Documentation updated**: Changes reflected in relevant docs
- [ ] **No secrets committed**: No API keys, tokens, or credentials
- [ ] **Commit messages follow guidelines**: Uses Conventional Commits format

### PR Template

Use this template when opening a PR:

```markdown
## Summary
<!-- Brief description of changes -->

## Type of Change
<!-- Check relevant boxes -->
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring

## Testing
<!-- Describe how you tested your changes -->

**Test Plan:**
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Tested on Raspberry Pi (if applicable)
- [ ] Tested in production build

**Test Results:**
- All tests pass: [ ]
- Coverage maintained/improved: [ ]
- No regressions: [ ]

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Related Issues
<!-- Link related issues: Closes #123, Fixes #456 -->

## Deployment Notes
<!-- Any special deployment considerations? -->

## Checklist
- [ ] Tests pass locally
- [ ] Build succeeds
- [ ] Linting passes
- [ ] Documentation updated
- [ ] No secrets committed
- [ ] Commit messages follow guidelines
```

### Review Process

1. **Automated Checks**: GitHub Actions will run tests and linting
2. **Code Review**: Maintainer(s) will review your PR
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, your PR will be merged
5. **Deployment**: Changes are automatically deployed to the Pi on merge to `main`

---

## Code Review Checklist

Reviewers will check for:

### Functionality
- [ ] Code does what it claims to do
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No regressions introduced

### Code Quality
- [ ] Follows existing patterns and conventions
- [ ] No unnecessary complexity
- [ ] Code is readable and maintainable
- [ ] No commented-out code or debug statements
- [ ] No hardcoded values that should be configurable

### Testing
- [ ] Tests are comprehensive
- [ ] Tests follow existing patterns
- [ ] Coverage meets or exceeds 85%
- [ ] Tests are meaningful, not just for coverage

### Security
- [ ] No security vulnerabilities introduced
- [ ] Input validation at system boundaries
- [ ] No secrets in code
- [ ] Dependencies are secure and up-to-date

### Performance
- [ ] No performance regressions
- [ ] Efficient algorithms used
- [ ] Appropriate caching implemented
- [ ] No unnecessary re-renders (React components)

### Design System (UI Changes)
- [ ] Follows "Quiet Presence" design principles
- [ ] Uses only white/black (monochrome)
- [ ] Uses opacity levels for hierarchy
- [ ] GPU-accelerated animations only (transform + opacity)
- [ ] Optimized for Raspberry Pi

### Documentation
- [ ] Code is self-documenting
- [ ] Complex logic has comments explaining "why"
- [ ] Public APIs are documented
- [ ] README/docs updated if needed

---

## Testing Requirements

### Coverage Target

- **Minimum**: 85% overall coverage
- **Components**: 95%+ coverage for widgets
- **API Routes**: 90%+ coverage for public endpoints
- **Utilities**: 90%+ coverage

### Running Tests

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
npm run test:ci           # CI mode (used in GitHub Actions)
```

### Writing Tests

**Follow these patterns:**

**1. Component Tests** (`src/__tests__/components/widgets/`)
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import YourWidget from '@/components/widgets/YourWidget';

describe('YourWidget', () => {
  it('displays loading state initially', () => {
    render(<YourWidget />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays data after fetch', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })
    );

    render(<YourWidget />);
    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });
});
```

**2. API Route Tests** (`src/__tests__/app/api/`)
```typescript
import { GET } from '@/app/api/your-route/route';

describe('GET /api/your-route', () => {
  it('returns data successfully', async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('expectedField');
  });

  it('handles errors gracefully', async () => {
    // Mock failure scenario
    const response = await GET();
    expect(response.status).toBe(500);
  });
});
```

**3. Utility Tests** (`src/__tests__/lib/`)
```typescript
import { yourUtilFunction } from '@/lib/your-util';

describe('yourUtilFunction', () => {
  it('handles valid input', () => {
    expect(yourUtilFunction('valid')).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(yourUtilFunction('')).toBe('default');
  });
});
```

### Test Coverage Report

After running `npm run test:coverage`, view the report:

```bash
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
```

---

## Documentation Requirements

### When to Update Documentation

**Always update docs when:**

- Adding a new feature
- Changing existing behavior
- Adding/modifying API endpoints
- Changing configuration options
- Adding new environment variables
- Changing deployment process

### Which Docs to Update

| Change Type | Update These Files |
|-------------|-------------------|
| New widget | `docs/ARCHITECTURE.md`, widget file comments |
| New API endpoint | `docs/API_DOCUMENTATION.md` |
| Design change | `docs/design/DESIGN_SYSTEM.md` |
| Setup/deployment | `README.md`, `CLAUDE.md`, `docs/TROUBLESHOOTING.md` |
| Testing approach | `docs/TESTING.md` |
| Architecture change | `docs/ARCHITECTURE.md` |

### Documentation Style

- **Be concise**: Clear, direct language
- **Use examples**: Code examples for technical docs
- **Be specific**: Avoid vague language like "usually" or "might"
- **Keep updated**: Remove outdated information
- **Use diagrams**: Mermaid diagrams for complex flows

---

## Design System Guidelines

All UI changes must follow the **"Quiet Presence"** design system.

### Core Principles

**1. Pure Monochrome**
- ✅ **Only** white (`#FFFFFF`) and black (`#000000`)
- ❌ **Never** use color, even grays

**2. Hierarchy via Opacity**
```css
.opacity-hero      { opacity: 1.0;  }  /* Most important */
.opacity-primary   { opacity: 0.87; }  /* Primary content */
.opacity-secondary { opacity: 0.6;  }  /* Supporting content */
.opacity-tertiary  { opacity: 0.38; }  /* Labels, metadata */
.opacity-disabled  { opacity: 0.2;  }  /* Disabled, loading */
```

**3. Typography**
- **Fonts**: Syne (display), DM Sans (body)
- **Weights**: 100-500 only (never bold)
- **Classes**: `.text-mirror-6xl` down to `.text-mirror-xs`

**4. Animations**
- **GPU-accelerated only**: `transform` and `opacity`
- ❌ **Never animate**: `width`, `height`, `left`, `top`, `margin`, `padding`
- **Timing**: 2-4 second breathing rhythms
- **Use tokens**: Import from `@/lib/tokens.ts`

**5. Spacing**
- **Base unit**: 8px
- **Use Tailwind**: `p-4`, `m-6`, `gap-8`, etc.

**6. Performance**
- **Target**: Raspberry Pi 4
- **No**: backdrop-blur, SVG filters, heavy particle systems
- **Test**: Always verify on Pi before merging

### Widget Development Checklist

When creating a new widget:

- [ ] Uses design system CSS classes
- [ ] Implements loading state (`.opacity-disabled`)
- [ ] Implements error state
- [ ] Has periodic refresh via `setInterval`
- [ ] Uses `@/lib/tokens.ts` for animations
- [ ] Tested on 1080x2560 portrait display
- [ ] Tested on Raspberry Pi
- [ ] Added tests (95%+ coverage)
- [ ] Added to `docs/ARCHITECTURE.md`

---

## Good First Issues

New to the project? Start with these beginner-friendly tasks:

### Documentation Improvements
- Add more examples to API documentation
- Improve error message documentation
- Add screenshots to widget documentation
- Translate documentation (if multilingual support desired)

### Testing
- Increase test coverage for admin portal (currently 0%)
- Add missing edge case tests
- Improve test descriptions

### UI/UX Enhancements
- Add loading animations to widgets
- Improve error state displays
- Add subtle transitions between states
- Optimize animations for performance

### Features (Small Scope)
- Add new weather data point (e.g., precipitation probability)
- Add configurable refresh intervals
- Add keyboard shortcuts for development
- Add more RSS news sources

### Refactoring
- Extract common widget patterns into hooks
- Simplify calendar event parsing
- Improve error handling consistency
- Add JSDoc comments to utility functions

### Bug Fixes
- Fix any issues labeled `good first issue` on GitHub
- Improve mobile responsiveness (if applicable)
- Fix accessibility issues

---

## Questions?

- **Documentation**: Check [docs/README.md](docs/README.md)
- **Technical questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Feature requests**: Open a GitHub Issue with the `enhancement` label

Thank you for contributing! 🎉
