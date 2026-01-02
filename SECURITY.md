# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 0.2.x   | :white_check_mark: | Current stable release |
| 0.1.x   | :x:                | No longer supported |

**Current Version:** 0.2.0

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure practices.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report security issues privately:

1. **Email**: Send details to the repository owner via GitHub
   - Go to [github.com/jjones-wps](https://github.com/jjones-wps)
   - Click "Send a message" or use GitHub's private vulnerability reporting

2. **Include in your report**:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact and severity
   - Suggested fix (if you have one)
   - Your contact information (for follow-up)

### What to Expect

- **Acknowledgment**: Within 48 hours of your report
- **Initial Assessment**: Within 7 days (severity determination)
- **Progress Updates**: Every 7 days until resolved
- **Resolution Timeline**:
  - **Critical**: 7 days
  - **High**: 14 days
  - **Medium**: 30 days
  - **Low**: 60 days

### Disclosure Policy

- **Coordinated Disclosure**: We will work with you to understand and resolve the issue before public disclosure
- **Public Disclosure Timeline**: 90 days after initial report (or sooner if resolved)
- **Credit**: Security researchers who responsibly disclose vulnerabilities will be credited (if desired)

---

## Security Best Practices

If you're deploying this project, follow these security guidelines:

### Environment Variables

**Never commit secrets to version control:**

- ✅ **Do**: Use `.env.local` (gitignored)
- ✅ **Do**: Use strong, unique secrets
- ✅ **Do**: Rotate API keys regularly
- ❌ **Don't**: Commit `.env` files
- ❌ **Don't**: Hardcode secrets in code
- ❌ **Don't**: Share API keys in screenshots or logs

**Generate secure secrets:**

```bash
# NextAuth Secret (32+ characters)
openssl rand -base64 32

# Admin Password Hash
# Use bcryptjs in Node.js (see .env.example)
```

### API Keys

**Protect third-party API keys:**

- **OpenRouter**: Limit API key permissions
- **Spotify**: Use OAuth with limited scopes
- **TomTom**: Restrict key to specific domains/IPs
- **Calendar URLs**: Use read-only iCal URLs

**Set rate limits and quotas where available.**

### Network Security

**Raspberry Pi Deployment:**

- ✅ **Do**: Use local network only (not exposed to internet)
- ✅ **Do**: Use strong WiFi passwords
- ✅ **Do**: Keep Raspberry Pi OS updated
- ❌ **Don't**: Expose port 3000 to the internet without authentication
- ❌ **Don't**: Use default SSH passwords

**If you must expose to internet:**

- Use reverse proxy (nginx, Caddy) with HTTPS
- Implement rate limiting
- Add authentication to all routes
- Use fail2ban for SSH
- Keep all dependencies updated

### Admin Portal

**Authentication (when completed):**

- Use strong passwords (12+ characters, mixed case, numbers, symbols)
- Enable 2FA if possible (future enhancement)
- Use secure session management (NextAuth handles this)
- Set appropriate session timeouts

**Database:**

- SQLite file permissions: `chmod 600 *.db`
- Regular backups
- No sensitive data in logs

### Dependency Security

**Keep dependencies updated:**

```bash
# Check for vulnerabilities
npm audit

# Fix automatically (where possible)
npm audit fix

# Update dependencies
npm update
```

**Review dependency changes before updating:**

- Check changelogs for breaking changes
- Run tests after updates
- Review security advisories

---

## Known Security Considerations

### Current Implementation

**1. Admin Portal (Incomplete)**
- **Status**: Work in progress, excluded from production
- **Risks**: Authentication not fully implemented
- **Mitigation**: Files marked with `@ts-nocheck`, excluded from build

**2. API Routes (Public)**
- **Status**: No authentication required
- **Design**: Intended for local network only
- **Risks**: If exposed to internet, anyone can access
- **Mitigation**: Deploy on local network, use firewall rules

**3. Calendar URLs**
- **Status**: URLs stored in environment variables
- **Risks**: iCal URLs may contain sensitive event data
- **Mitigation**: Use read-only URLs, don't expose `.env.local`

**4. Spotify OAuth**
- **Status**: OAuth tokens stored in-memory (not persisted)
- **Risks**: Tokens expire, require re-authentication
- **Mitigation**: Refresh token flow implemented

### Attack Vectors (Local Network Context)

**Low Risk (Mitigated by local network deployment):**

- ❌ SQL Injection - Not applicable (no user input to SQL)
- ❌ XSS - Low risk (no user-generated content rendered)
- ❌ CSRF - Low risk (read-only for most features)
- ❌ Authentication Bypass - Low risk (admin portal incomplete, not exposed)

**Potential Risks:**

- ⚠️ **API Key Exposure**: If `.env.local` leaked, third-party services could be accessed
  - **Mitigation**: Keep `.env.local` gitignored, set API key restrictions
- ⚠️ **Calendar Data Exposure**: Calendar URLs may reveal personal information
  - **Mitigation**: Use read-only URLs, deploy on trusted network
- ⚠️ **Denial of Service**: External API failures could affect display
  - **Mitigation**: Fallback data, timeout handling implemented

---

## Security Features

### Current Protections

**1. Server-Side API Proxying**
- API keys never exposed to client
- All external API calls server-side only
- Client receives processed data only

**2. Input Validation**
- Environment variable validation at startup
- API response validation before processing
- Error handling prevents information leakage

**3. Next.js Security Features**
- Automatic CSRF protection
- XSS protection via React
- HTTP headers security (Next.js defaults)

**4. Dependency Management**
- Regular `npm audit` checks
- Automated Dependabot alerts (GitHub)
- Minimal dependency footprint

**5. Build-Time Security**
- TypeScript strict mode
- ESLint security rules
- No sensitive data in build output

### Future Enhancements

Planned security improvements:

- [ ] Complete admin portal authentication (NextAuth)
- [ ] Add API rate limiting
- [ ] Implement request signing
- [ ] Add audit logging
- [ ] Add Content Security Policy (CSP)
- [ ] Add HTTPS support for Pi deployment

---

## Security Checklist (Deployment)

Before deploying, verify:

- [ ] All API keys configured in `.env.local`
- [ ] `.env.local` is gitignored and not committed
- [ ] Strong secrets generated for NextAuth
- [ ] Admin password hashed with bcrypt
- [ ] Pi deployed on local network only (or properly secured)
- [ ] Dependencies updated (`npm audit`)
- [ ] No debug logs exposing sensitive data
- [ ] Database file permissions set (`chmod 600`)
- [ ] Raspberry Pi OS updated
- [ ] SSH configured with key-based auth (not password)

---

## Security Updates

Security updates are released as patch versions (e.g., 0.2.1, 0.2.2).

**How to update:**

```bash
git pull origin main
npm install
npm run build
pm2 restart magic-mirror
```

**Monitor for updates:**

- Watch this repository for releases
- Enable GitHub notifications for security advisories
- Review CHANGELOG.md for security fixes

---

## Contact

For security-related questions or concerns:

- **Private vulnerability reports**: Use GitHub's private reporting feature
- **General security questions**: Open a GitHub Discussion (for non-sensitive topics)
- **Repository owner**: [github.com/jjones-wps](https://github.com/jjones-wps)

---

## Acknowledgments

We thank security researchers who responsibly disclose vulnerabilities. Your efforts help keep this project secure.

**Hall of Fame:**
- (None yet - be the first!)

---

**Last Updated:** January 1, 2026
