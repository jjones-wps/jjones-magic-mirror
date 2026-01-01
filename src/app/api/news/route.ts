/**
 * News API Route
 * Fetches and parses RSS feeds server-side
 */

import { NextResponse } from 'next/server';

// ============================================
// TYPES
// ============================================

interface NewsArticle {
  id: string;
  title: string;
  source: string;
  link: string;
  pubDate: string; // ISO string
  description?: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  lastUpdated: string;
}

// ============================================
// RSS FEEDS CONFIGURATION
// ============================================

const NEWS_FEEDS = [
  // Local Fort Wayne news (prioritized)
  { url: 'https://www.wane.com/feed/', source: 'WANE 15' },
  { url: 'https://www.wishtv.com/feed/', source: 'WISH-TV' }, // Indiana statewide
  { url: 'https://www.ibj.com/feed', source: 'IBJ' }, // Indiana Business Journal

  // National headlines
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', source: 'NY Times' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
  { url: 'https://www.npr.org/rss/rss.php?id=1001', source: 'NPR' },

  // Tech news (optional - uncomment if desired)
  // { url: "https://feeds.arstechnica.com/arstechnica/index", source: "Ars Technica" },
  // { url: "https://www.theverge.com/rss/index.xml", source: "The Verge" },
];

// ============================================
// RSS PARSING
// ============================================

async function fetchRSSFeed(url: string, source: string): Promise<NewsArticle[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MagicMirror/1.0',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${source}: ${response.status}`);
      return [];
    }

    const text = await response.text();
    const articles: NewsArticle[] = [];

    // Parse RSS items
    const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches.slice(0, 5)) {
      const title = extractTag(itemXml, 'title');
      const link = extractTag(itemXml, 'link');
      const pubDate = extractTag(itemXml, 'pubDate');
      const guid = extractTag(itemXml, 'guid');
      const description = extractTag(itemXml, 'description');

      if (title) {
        articles.push({
          id: guid || link || `${source}-${articles.length}`,
          title: cleanText(title),
          source,
          link: link || '',
          pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          description: description ? cleanText(description).slice(0, 300) : undefined,
        });
      }
    }

    console.log(`Fetched ${articles.length} articles from ${source}`);
    return articles;
  } catch (error) {
    console.error(`Error fetching ${source}:`, error);
    return [];
  }
}

function extractTag(xml: string, tag: string): string | null {
  // Handle both regular tags and CDATA
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10))) // Numeric entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .trim();
}

// ============================================
// API HANDLER
// ============================================

export async function GET() {
  // Fetch all feeds in parallel
  const results = await Promise.all(NEWS_FEEDS.map((feed) => fetchRSSFeed(feed.url, feed.source)));

  // Merge all articles
  const allArticles = results.flat();

  // Sort by date (newest first) and deduplicate by title similarity
  const seenTitles = new Set<string>();
  const uniqueArticles = allArticles
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .filter((article) => {
      // Simple deduplication by normalized title
      const normalizedTitle = article.title.toLowerCase().slice(0, 50);
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    })
    .slice(0, 8);

  const response: NewsResponse = {
    articles: uniqueArticles,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
