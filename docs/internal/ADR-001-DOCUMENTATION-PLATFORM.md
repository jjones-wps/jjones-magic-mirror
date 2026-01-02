# ADR 001: Documentation Platform Decision

**Status:** Accepted
**Date:** January 1, 2026
**Decision Makers:** Project maintainer(s)
**Context:** Phase 6 of documentation audit - evaluating documentation platforms

---

## Context and Problem Statement

During the documentation audit (Phase 6), we evaluated whether to implement **Docusaurus** as a documentation site platform versus continuing with the current **GitHub-native markdown** approach.

**Question:** Should we invest in setting up Docusaurus for our documentation, or continue with our current markdown-based approach?

## Decision Drivers

- Documentation quality and accessibility
- Maintenance overhead
- Deployment complexity
- Search functionality
- Mobile responsiveness
- Team familiarity
- Cost (time and infrastructure)
- Project scale and scope

---

## Considered Options

### Option 1: Implement Docusaurus

**Docusaurus** is a modern static site generator designed for documentation.

**Pros:**
- ✅ Built-in search functionality
- ✅ Versioned documentation support
- ✅ Customizable theme
- ✅ Plugin ecosystem
- ✅ MDX support (interactive components in docs)
- ✅ Dark mode built-in
- ✅ Optimized for documentation sites
- ✅ Auto-generated sidebar navigation

**Cons:**
- ❌ **Setup time:** 8-10 hours initial setup
- ❌ **Maintenance overhead:** Requires npm dependencies, build pipeline, CI/CD updates
- ❌ **Additional infrastructure:** GitHub Pages deployment, separate build process
- ❌ **Overkill for scale:** Project has ~8 markdown files
- ❌ **Learning curve:** Team needs to learn Docusaurus conventions
- ❌ **Build complexity:** Another build step in deployment pipeline
- ❌ **Version management:** Adds complexity for single-version API

**Estimated Effort:**
- Initial setup: 8-10 hours
- Migration: 2-3 hours
- Ongoing maintenance: 1-2 hours/month
- **Total first month:** 10-15 hours

### Option 2: Continue with GitHub-Native Markdown (Current Approach)

**GitHub markdown** with organized directory structure.

**Pros:**
- ✅ **Zero additional infrastructure:** Works out of the box
- ✅ **GitHub's excellent markdown rendering:** Supports Mermaid diagrams, tables, code blocks
- ✅ **No build step:** Edit and commit, instantly visible
- ✅ **Familiar to all developers:** Standard markdown
- ✅ **Low maintenance:** No dependencies to update
- ✅ **Fast:** No build time, no deployment pipeline
- ✅ **Version control native:** Git-based, familiar workflow
- ✅ **Mobile responsive:** GitHub's UI is mobile-friendly
- ✅ **Search via GitHub:** GitHub's code search covers documentation

**Cons:**
- ❌ **No full-text search UI:** Users must use GitHub search or browser find
- ❌ **Limited customization:** Can't customize layout/theme
- ❌ **No versioning UI:** Would need manual version folders
- ❌ **No analytics:** Can't track documentation usage (GitHub provides repo analytics only)

**Estimated Effort:**
- Ongoing maintenance: 30 minutes/month (existing workflow)
- **Total:** Minimal incremental effort

### Option 3: Hybrid Approach (Lightweight Enhancement)

Use GitHub markdown + lightweight enhancements:

**Enhancements considered:**
- **MkDocs Material:** Simpler than Docusaurus
- **Just the Docs (Jekyll):** GitHub Pages native
- **mdBook:** Rust-based, very fast

**Conclusion:** These options have similar trade-offs to Docusaurus with different tooling. The core question remains: "Do we need a documentation site?"

---

## Decision Outcome

**Chosen option:** **Option 2 - Continue with GitHub-Native Markdown**

### Rationale

1. **Scale vs. Investment:**
   - Project has 8 well-organized markdown files (~3,000 lines total)
   - 10-15 hours for Docusaurus is not justified for this scale
   - Current organization (docs/ directory with README hub) is sufficient

2. **GitHub's Capabilities Are Sufficient:**
   - GitHub renders Mermaid diagrams beautifully (5 diagrams in ARCHITECTURE.md)
   - Built-in table of contents for long markdown files
   - Syntax highlighting for all code blocks
   - Mobile-responsive UI
   - Fast loading times

3. **Low Maintenance Burden:**
   - Current approach requires zero build pipeline
   - No npm dependencies to update
   - No deployment complexity
   - Documentation changes are immediate

4. **Search is Adequate:**
   - GitHub's code search covers all documentation
   - Users can use browser find (Ctrl+F) within pages
   - Small documentation set doesn't require advanced search
   - docs/README.md provides navigation hub

5. **Single Version API:**
   - No versioning needed (v1 implicit)
   - Breaking changes handled via CHANGELOG.md
   - No need for version selector UI

6. **Team Workflow:**
   - Everyone familiar with markdown
   - Same workflow as code contributions
   - No context switching between tools

### Supporting Evidence

**Current documentation quality metrics:**
- ✅ 100% of docs up-to-date (Last Updated dates tracked)
- ✅ 85% coverage (excellent per audit)
- ✅ 0 broken links (all relative paths verified)
- ✅ 5 comprehensive Mermaid diagrams
- ✅ Navigation hub (docs/README.md) with 4 persona paths
- ✅ GitHub renders everything perfectly

**User needs met without Docusaurus:**
- New developers: docs/README.md provides clear starting point
- API consumers: API_DOCUMENTATION.md + openapi.yaml covers all endpoints
- Contributors: CONTRIBUTING.md + ARCHITECTURE.md explains patterns
- Deployment maintainers: TROUBLESHOOTING.md solves common issues

---

## Positive Consequences

- **Time savings:** 10-15 hours not spent on setup/migration
- **Simplicity:** One less system to maintain
- **Velocity:** Documentation changes deploy instantly
- **Familiarity:** No learning curve for contributors
- **Reliability:** No build failures, no deployment issues

---

## Negative Consequences

- **No advanced search UI:** Users rely on GitHub search or Ctrl+F
- **No analytics:** Can't track which docs are most viewed
- **Limited customization:** Stuck with GitHub's rendering
- **No interactive examples:** Can't embed live code demos (though OpenAPI spec provides interactive API explorer)

### Mitigation Strategies

1. **Search:**
   - Add "How to search" section to docs/README.md
   - GitHub code search: `repo:jjones-wps/jjones-magic-mirror <keyword>`
   - Comprehensive table of contents in each doc

2. **Analytics:**
   - Monitor GitHub traffic: Repository → Insights → Traffic
   - Track documentation issues to identify pain points

3. **Interactivity:**
   - OpenAPI spec provides interactive API exploration (Swagger UI)
   - Code examples in all documentation
   - Mermaid diagrams for visual explanations

---

## Future Re-evaluation Triggers

We may revisit this decision if:

1. **Documentation grows significantly:**
   - \>20 markdown files (~10,000+ lines total)
   - Multiple product versions requiring version selector

2. **User feedback indicates problems:**
   - Users report difficulty finding information
   - Multiple requests for search functionality
   - High number of documentation-related issues

3. **Team grows:**
   - Multiple contributors need sophisticated documentation tooling
   - Need for collaborative editing features

4. **Commercial offering:**
   - Project becomes a commercial product
   - Need for branded documentation portal
   - Marketing requirements for documentation site

---

## References

- **Docusaurus:** https://docusaurus.io/
- **GitHub Markdown:** https://docs.github.com/en/get-started/writing-on-github
- **OpenAPI Spec:** openapi.yaml (provides interactive API docs)
- **Documentation Audit Results:** docs/internal/PROJECT_AUDIT.md

---

## Appendix: Documentation Site Comparison

| Feature | GitHub Markdown | Docusaurus | MkDocs | mdBook |
|---------|----------------|------------|--------|--------|
| **Setup time** | 0 min | 8-10 hours | 2-3 hours | 1-2 hours |
| **Build required** | No | Yes | Yes | Yes |
| **Deployment** | None | GitHub Pages | GitHub Pages | GitHub Pages |
| **Search** | GitHub + Ctrl+F | Full-text | Full-text | Full-text |
| **Versioning** | Manual | Built-in | Plugin | Manual |
| **Mermaid support** | Native | Plugin | Plugin | Plugin |
| **Theme customization** | None | Full | Full | Limited |
| **Maintenance** | None | npm updates | pip updates | cargo updates |
| **Mobile friendly** | Yes | Yes | Yes | Yes |
| **Learning curve** | None | Medium | Low | Low |

**Winner for our use case:** GitHub Markdown (zero setup, zero maintenance, sufficient features)

---

**Decision Status:** ✅ Accepted
**Next Review:** January 2027 (or when triggers above occur)
