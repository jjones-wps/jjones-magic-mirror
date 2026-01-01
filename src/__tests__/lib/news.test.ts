/**
 * Tests for News utility functions
 */

import { formatTimeAgo, getDemoNewsData, fetchNews } from '@/lib/news';

// Mock fetch globally
global.fetch = jest.fn();

describe('formatTimeAgo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "Just now" for times less than 1 minute ago', () => {
    const thirtySecondsAgo = new Date('2024-01-15T11:59:30');
    expect(formatTimeAgo(thirtySecondsAgo)).toBe('Just now');

    const fiveSecondsAgo = new Date('2024-01-15T11:59:55');
    expect(formatTimeAgo(fiveSecondsAgo)).toBe('Just now');
  });

  it('should format minutes ago', () => {
    const twoMinutesAgo = new Date('2024-01-15T11:58:00');
    expect(formatTimeAgo(twoMinutesAgo)).toBe('2m ago');

    const fifteenMinutesAgo = new Date('2024-01-15T11:45:00');
    expect(formatTimeAgo(fifteenMinutesAgo)).toBe('15m ago');

    const fiftyNineMinutesAgo = new Date('2024-01-15T11:01:00');
    expect(formatTimeAgo(fiftyNineMinutesAgo)).toBe('59m ago');
  });

  it('should format hours ago', () => {
    const oneHourAgo = new Date('2024-01-15T11:00:00');
    expect(formatTimeAgo(oneHourAgo)).toBe('1h ago');

    const fiveHoursAgo = new Date('2024-01-15T07:00:00');
    expect(formatTimeAgo(fiveHoursAgo)).toBe('5h ago');

    const twentyThreeHoursAgo = new Date('2024-01-14T13:00:00');
    expect(formatTimeAgo(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('should format days ago', () => {
    const oneDayAgo = new Date('2024-01-14T12:00:00');
    expect(formatTimeAgo(oneDayAgo)).toBe('1d ago');

    const threeDaysAgo = new Date('2024-01-12T12:00:00');
    expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago');

    const sixDaysAgo = new Date('2024-01-09T12:00:00');
    expect(formatTimeAgo(sixDaysAgo)).toBe('6d ago');
  });

  it('should return formatted date for times over 7 days ago', () => {
    const eightDaysAgo = new Date('2024-01-07T12:00:00');
    const formatted = formatTimeAgo(eightDaysAgo);
    expect(formatted).toMatch(/1\/7\/2024/);

    const twoWeeksAgo = new Date('2024-01-01T12:00:00');
    const formatted2 = formatTimeAgo(twoWeeksAgo);
    expect(formatted2).toMatch(/1\/1\/2024/);
  });
});

describe('getDemoNewsData', () => {
  it('should return demo data with correct structure', () => {
    const data = getDemoNewsData();

    expect(data).toHaveProperty('articles');
    expect(data).toHaveProperty('lastUpdated');
    expect(Array.isArray(data.articles)).toBe(true);
  });

  it('should have 5 demo articles', () => {
    const data = getDemoNewsData();
    expect(data.articles).toHaveLength(5);
  });

  it('should have valid article structure', () => {
    const data = getDemoNewsData();
    const article = data.articles[0];

    expect(article).toHaveProperty('id');
    expect(article).toHaveProperty('title');
    expect(article).toHaveProperty('source');
    expect(article).toHaveProperty('link');
    expect(article).toHaveProperty('pubDate');
    expect(article.pubDate).toBeInstanceOf(Date);
  });

  it('should have articles with different sources', () => {
    const data = getDemoNewsData();
    const sources = data.articles.map((a) => a.source);

    expect(new Set(sources).size).toBeGreaterThan(1);
  });

  it('should have recent publication dates', () => {
    const data = getDemoNewsData();
    const now = new Date();

    data.articles.forEach((article) => {
      const ageMs = now.getTime() - article.pubDate.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      expect(ageHours).toBeLessThan(5); // All within 5 hours
    });
  });
});

describe('fetchNews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and parse RSS feeds', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss version="2.0">
        <channel>
          <item>
            <title><![CDATA[Breaking News Story]]></title>
            <link>https://example.com/news/1</link>
            <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
            <guid>news-1</guid>
            <description><![CDATA[This is a test article]]></description>
          </item>
          <item>
            <title>Another Story</title>
            <link>https://example.com/news/2</link>
            <pubDate>Mon, 15 Jan 2024 11:00:00 GMT</pubDate>
            <guid>news-2</guid>
          </item>
        </channel>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles).toBeDefined();
    expect(result.lastUpdated).toBeInstanceOf(Date);
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const result = await fetchNews();

    expect(result.articles).toBeDefined();
    expect(result.articles).toEqual([]);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should clean CDATA tags from titles', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss>
        <item>
          <title><![CDATA[Test &amp; Story]]></title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
          <guid>1</guid>
        </item>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles[0]?.title).toBe('Test & Story');
  });

  it('should decode HTML entities in titles', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss>
        <item>
          <title>Test &amp; &quot;quoted&quot; &#39;text&#39;</title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
          <guid>1</guid>
        </item>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles[0]?.title).toBe('Test & "quoted" \'text\'');
  });

  it('should strip HTML tags from titles', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss>
        <item>
          <title><strong>Bold</strong> and <em>italic</em> text</title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
          <guid>1</guid>
        </item>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles[0]?.title).toBe('Bold and italic text');
  });

  it('should parse descriptions when available', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss>
        <item>
          <title>Test Story</title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
          <guid>1</guid>
          <description><![CDATA[<p>Article description here</p>]]></description>
        </item>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles[0]?.description).toBe('Article description here');
  });

  it('should limit to 10 items per feed', async () => {
    // Create RSS with 15 items
    const items = Array.from({ length: 15 }, (_, i) => `
      <item>
        <title>Article ${i + 1}</title>
        <link>https://example.com/${i + 1}</link>
        <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
        <guid>${i + 1}</guid>
      </item>
    `).join('');

    const mockRSSFeed = `<?xml version="1.0"?><rss>${items}</rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    // Should only process first 10 items, then limit to 8 in final output
    expect(result.articles.length).toBeLessThanOrEqual(10);
  });

  it('should sort articles by date (newest first)', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss>
        <item>
          <title>Older Story</title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
          <guid>1</guid>
        </item>
        <item>
          <title>Newer Story</title>
          <link>https://example.com/2</link>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
          <guid>2</guid>
        </item>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles[0]?.title).toBe('Newer Story');
    expect(result.articles[1]?.title).toBe('Older Story');
  });

  it('should limit final output to 8 articles', async () => {
    // Create RSS with 10 items (max per feed)
    const items = Array.from({ length: 10 }, (_, i) => `
      <item>
        <title>Article ${i + 1}</title>
        <link>https://example.com/${i + 1}</link>
        <pubDate>Mon, 15 Jan 2024 12:${String(i).padStart(2, '0')}:00 GMT</pubDate>
        <guid>${i + 1}</guid>
      </item>
    `).join('');

    const mockRSSFeed = `<?xml version="1.0"?><rss>${items}</rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles.length).toBeLessThanOrEqual(8);
  });

  it('should generate fallback IDs when guid is missing', async () => {
    const mockRSSFeed = `<?xml version="1.0"?>
      <rss>
        <item>
          <title>Story without GUID</title>
          <link>https://example.com/1</link>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
        </item>
      </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      text: async () => mockRSSFeed,
    });

    const result = await fetchNews();

    expect(result.articles[0]?.id).toBeDefined();
    expect(result.articles[0]?.id.length).toBeGreaterThan(0);
  });
});
