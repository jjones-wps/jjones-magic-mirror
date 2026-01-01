'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { getDemoNewsData, formatTimeAgo, type NewsData, type NewsArticle } from '@/lib/news';
import { opacity, staggerContainer, staggerItem } from '@/lib/tokens';

// ============================================
// CONFIGURATION
// ============================================
const REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes

// ============================================
// API RESPONSE TYPE
// ============================================
interface NewsAPIResponse {
  articles: Array<{
    id: string;
    title: string;
    source: string;
    link: string;
    pubDate: string;
    description?: string;
  }>;
  lastUpdated: string;
}

function parseAPIResponse(data: NewsAPIResponse): NewsData {
  return {
    articles: data.articles.map((a) => ({
      ...a,
      pubDate: new Date(a.pubDate),
    })),
    lastUpdated: new Date(data.lastUpdated),
  };
}

// ============================================
// HEADLINE ITEM COMPONENT
// ============================================
interface HeadlineItemProps {
  article: NewsArticle;
  index: number;
}

function HeadlineItem({ article, index }: HeadlineItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="py-4 border-b border-white/5 last:border-b-0"
    >
      {/* Headline */}
      <div
        className="text-mirror-base font-light font-body leading-relaxed"
        style={{ opacity: opacity.primary }}
      >
        {article.title}
      </div>

      {/* Source and time */}
      <div className="mt-2 flex items-center gap-3">
        <span
          className="text-mirror-xs font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {article.source}
        </span>
        <span
          className="text-mirror-xs font-extralight font-body"
          style={{ opacity: opacity.disabled }}
        >
          {formatTimeAgo(article.pubDate)}
        </span>
      </div>
    </motion.div>
  );
}

// ============================================
// MAIN NEWS COMPONENT
// ============================================
export default function News() {
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    async function loadNews() {
      try {
        const response = await fetch('/api/news');

        if (response.ok) {
          const data: NewsAPIResponse = await response.json();
          setNews(parseAPIResponse(data));
          setIsDemo(false);
        } else {
          console.warn('News API failed, using demo data');
          setNews(getDemoNewsData());
          setIsDemo(true);
        }
      } catch (error) {
        console.error('News fetch error:', error);
        setNews(getDemoNewsData());
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }

    loadNews();

    // Refresh news periodically
    const interval = setInterval(loadNews, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="widget">
        <div className="label">Headlines</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">Loading...</div>
      </div>
    );
  }

  // No data state
  if (!news || news.articles.length === 0) {
    return (
      <div className="widget">
        <div className="label">Headlines</div>
        <div className="mt-6 text-mirror-base font-extralight opacity-disabled">
          No headlines available
        </div>
      </div>
    );
  }

  return (
    <motion.div className="widget" initial="initial" animate="animate" variants={staggerContainer}>
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <span className="label">Headlines</span>
        <motion.span
          variants={staggerItem}
          className="text-mirror-sm font-extralight font-body"
          style={{ opacity: opacity.tertiary }}
        >
          {isDemo ? 'Demo' : format(news.lastUpdated, 'h:mm a')}
        </motion.span>
      </div>

      {/* Headlines list */}
      <div className="mt-4">
        <AnimatePresence mode="popLayout">
          {news.articles.slice(0, 5).map((article, i) => (
            <HeadlineItem key={article.id} article={article} index={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer with sources */}
      <motion.div variants={staggerItem} className="mt-4">
        <span
          className="text-mirror-xs font-extralight font-body"
          style={{ opacity: opacity.disabled }}
        >
          {isDemo
            ? 'Demo headlines'
            : `Sources: ${[...new Set(news.articles.map((a) => a.source))].join(', ')}`}
        </span>
      </motion.div>
    </motion.div>
  );
}
