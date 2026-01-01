/**
 * Tests for News API route
 * @jest-environment @edge-runtime/jest-environment
 */

import { GET } from '@/app/api/news/route';

// Mock fetch globally
global.fetch = jest.fn();

const mockRSSFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test News</title>
    <item>
      <title>Breaking News Story</title>
      <link>https://example.com/article-1</link>
      <guid>article-1</guid>
      <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
      <description><![CDATA[This is a test article with HTML <strong>tags</strong>]]></description>
    </item>
    <item>
      <title>Second Story</title>
      <link>https://example.com/article-2</link>
      <guid>article-2</guid>
      <pubDate>Mon, 15 Jan 2024 09:00:00 GMT</pubDate>
      <description>Another article description</description>
    </item>
  </channel>
</rss>`;

const mockRSSFeedWithEntities = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>News &amp; Updates: Tech &#039;Revolution&#039;</title>
      <link>https://example.com/article-3</link>
      <guid>article-3</guid>
      <pubDate>Mon, 15 Jan 2024 11:00:00 GMT</pubDate>
      <description>Description with &nbsp; space &amp; entities</description>
    </item>
  </channel>
</rss>`;

describe('GET /api/news', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and parse RSS feeds successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.articles).toHaveLength(2);
    expect(data.articles[0]).toEqual({
      id: 'article-1',
      title: 'Breaking News Story',
      source: expect.any(String),
      link: 'https://example.com/article-1',
      pubDate: expect.any(String),
      description: 'This is a test article with HTML tags',
    });
    expect(data.lastUpdated).toBeDefined();
  });

  it('should fetch from multiple RSS sources', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    await GET();

    // Should call fetch for each feed in NEWS_FEEDS
    expect(global.fetch).toHaveBeenCalledTimes(6); // 6 default feeds configured
  });

  it('should clean HTML entities correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeedWithEntities,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.articles[0].title).toBe("News & Updates: Tech 'Revolution'");
    expect(data.articles[0].description).toBe('Description with   space & entities');
  });

  it('should remove CDATA tags', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    const response = await GET();
    const data = await response.json();

    // CDATA in description should be removed
    expect(data.articles[0].description).not.toContain('<![CDATA[');
    expect(data.articles[0].description).not.toContain(']]>');
  });

  it('should strip HTML tags from descriptions', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.articles[0].description).not.toContain('<strong>');
    expect(data.articles[0].description).toBe('This is a test article with HTML tags');
  });

  it('should sort articles by date (newest first)', async () => {
    const feedWithDates = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>Older Article</title>
          <link>https://example.com/old</link>
          <guid>old</guid>
          <pubDate>Mon, 15 Jan 2024 08:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Newer Article</title>
          <link>https://example.com/new</link>
          <guid>new</guid>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => feedWithDates,
    });

    const response = await GET();
    const data = await response.json();

    // First article should be the newer one
    expect(data.articles[0].title).toBe('Newer Article');
  });

  it('should deduplicate similar titles', async () => {
    const feedWithDuplicates = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>Breaking: Major Technology Breakthrough Announced By Scientists Today</title>
          <link>https://example.com/1</link>
          <guid>1</guid>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Breaking: Major Technology Breakthrough Announced By Scientists Today - Updated</title>
          <link>https://example.com/2</link>
          <guid>2</guid>
          <pubDate>Mon, 15 Jan 2024 11:00:00 GMT</pubDate>
        </item>
        <item>
          <title>Completely Different Story</title>
          <link>https://example.com/3</link>
          <guid>3</guid>
          <pubDate>Mon, 15 Jan 2024 10:00:00 GMT</pubDate>
        </item>
      </channel>
    </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => feedWithDuplicates,
    });

    const response = await GET();
    const data = await response.json();

    // Should have deduplicated the similar titles
    const titles = data.articles.map((a: { title: string }) => a.title);
    expect(titles).toContain('Breaking: Major Technology Breakthrough Announced By Scientists Today');
    expect(titles).toContain('Completely Different Story');
    // Second similar title should be filtered out (both start with same 50 chars)
    expect(titles.filter((t: string) => t.includes('Breaking: Major Technology Breakthrough')).length).toBe(1);
  });

  it('should limit to 8 articles', async () => {
    const feedWithMany = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        ${Array.from({ length: 20 }, (_, i) => `
          <item>
            <title>Article ${i + 1}</title>
            <link>https://example.com/${i}</link>
            <guid>guid-${i}</guid>
            <pubDate>Mon, 15 Jan 2024 ${String(i).padStart(2, '0')}:00:00 GMT</pubDate>
          </item>
        `).join('')}
      </channel>
    </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => feedWithMany,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.articles.length).toBeLessThanOrEqual(8);
  });

  it('should handle feed fetch errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.articles).toEqual([]);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should handle network errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.articles).toEqual([]);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('should include User-Agent header in requests', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    await GET();

    const firstCall = (global.fetch as jest.Mock).mock.calls[0];
    expect(firstCall[1]).toHaveProperty('headers');
    expect(firstCall[1].headers).toHaveProperty('User-Agent', 'MagicMirror/1.0');
  });

  it('should truncate descriptions to 300 characters', async () => {
    const longDescription = 'A'.repeat(500);
    const feedWithLongDesc = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>Test Article</title>
          <link>https://example.com/test</link>
          <guid>test</guid>
          <pubDate>Mon, 15 Jan 2024 12:00:00 GMT</pubDate>
          <description>${longDescription}</description>
        </item>
      </channel>
    </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => feedWithLongDesc,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.articles[0].description?.length).toBeLessThanOrEqual(300);
  });

  it('should handle missing fields gracefully', async () => {
    const minimalFeed = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>Minimal Article</title>
        </item>
      </channel>
    </rss>`;

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => minimalFeed,
    });

    const response = await GET();
    const data = await response.json();

    expect(data.articles[0]).toEqual({
      id: expect.any(String),
      title: 'Minimal Article',
      source: expect.any(String),
      link: '',
      pubDate: expect.any(String),
      description: undefined,
    });
  });

  it('should include lastUpdated timestamp', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    const before = new Date();
    const response = await GET();
    const data = await response.json();
    const after = new Date();

    const lastUpdated = new Date(data.lastUpdated);
    expect(lastUpdated.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUpdated.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should assign source name from feed configuration', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      text: async () => mockRSSFeed,
    });

    const response = await GET();
    const data = await response.json();

    // Should have source from NEWS_FEEDS configuration
    expect(data.articles[0].source).toBeDefined();
    expect(typeof data.articles[0].source).toBe('string');
    expect(data.articles[0].source.length).toBeGreaterThan(0);
  });
});
