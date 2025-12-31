/**
 * News Service
 * Fetches headlines from RSS feeds
 */

// ============================================
// TYPES
// ============================================

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDate: Date;
  description?: string;
}

export interface NewsData {
  articles: NewsArticle[];
  lastUpdated: Date;
}

// ============================================
// RSS PARSING
// ============================================

async function parseRSSFeed(
  url: string,
  source: string
): Promise<NewsArticle[]> {
  try {
    const response = await fetch(url);
    const text = await response.text();

    // Simple XML parsing (avoiding heavy dependencies)
    const items: NewsArticle[] = [];
    const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches.slice(0, 10)) {
      const title = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
      const link = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1];
      const pubDate = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1];
      const guid = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1];
      const description = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1];

      if (title) {
        // Clean CDATA and HTML entities
        const cleanTitle = title
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]+>/g, "")
          .trim();

        if (cleanTitle) {
          items.push({
            id: guid || link || `${source}-${items.length}`,
            title: cleanTitle,
            source,
            link: link?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() || "",
            pubDate: pubDate ? new Date(pubDate) : new Date(),
            description: description
              ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
              .replace(/<[^>]+>/g, "")
              .trim(),
          });
        }
      }
    }

    return items;
  } catch (error) {
    console.error(`Failed to fetch RSS feed: ${url}`, error);
    return [];
  }
}

// ============================================
// NEWS SOURCES
// ============================================

const NEWS_FEEDS = [
  {
    url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en",
    source: "Google News",
  },
  // Alternative feeds (uncomment as needed):
  // { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", source: "NY Times" },
  // { url: "https://feeds.bbci.co.uk/news/rss.xml", source: "BBC" },
  // { url: "https://www.reddit.com/r/news/.rss", source: "Reddit" },
];

// ============================================
// MAIN FETCH FUNCTION
// ============================================

export async function fetchNews(): Promise<NewsData> {
  const allArticles: NewsArticle[] = [];

  // Fetch all feeds in parallel
  const results = await Promise.all(
    NEWS_FEEDS.map((feed) => parseRSSFeed(feed.url, feed.source))
  );

  // Merge and deduplicate
  for (const articles of results) {
    allArticles.push(...articles);
  }

  // Sort by date (newest first) and take top headlines
  const sortedArticles = allArticles
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 8);

  return {
    articles: sortedArticles,
    lastUpdated: new Date(),
  };
}

// ============================================
// DEMO DATA
// ============================================

export function getDemoNewsData(): NewsData {
  return {
    articles: [
      {
        id: "1",
        title: "Scientists Discover New Method for Carbon Capture",
        source: "Science Daily",
        link: "#",
        pubDate: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        id: "2",
        title: "Tech Giants Report Strong Quarterly Earnings",
        source: "Bloomberg",
        link: "#",
        pubDate: new Date(Date.now() - 60 * 60 * 1000),
      },
      {
        id: "3",
        title: "Local Community Celebrates Annual Winter Festival",
        source: "Fort Wayne Journal",
        link: "#",
        pubDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: "4",
        title: "New Study Reveals Benefits of Morning Exercise",
        source: "Health Today",
        link: "#",
        pubDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        id: "5",
        title: "Space Agency Announces Mars Mission Timeline",
        source: "NASA News",
        link: "#",
        pubDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
    ],
    lastUpdated: new Date(),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format relative time for news articles
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
