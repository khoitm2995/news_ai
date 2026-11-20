/**
 * Vercel Serverless Function: /api/news
 * Truy vấn trực tiếp trang tìm kiếm tin tức (Google News Search & Bing News Search) từ máy chủ Vercel
 * Không phụ thuộc rss2json bên thứ ba, không bị lỗi CORS.
 */

function decodeXmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssXml(xmlText, defaultSource) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xmlText)) !== null && items.length < 20) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
    const descMatch = block.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
    const pubMatch = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);

    const rawTitle = decodeXmlEntities(titleMatch ? titleMatch[1] : "");
    const rawLink = decodeXmlEntities(linkMatch ? linkMatch[1] : "");
    const rawDesc = decodeXmlEntities(descMatch ? descMatch[1] : "");
    const pubDate = pubMatch ? pubMatch[1].trim() : new Date().toISOString();
    let source = decodeXmlEntities(sourceMatch ? sourceMatch[1] : "");

    let pureTitle = rawTitle;
    if (!source && rawTitle.includes(" - ")) {
      const parts = rawTitle.split(" - ");
      const last = parts[parts.length - 1].trim();
      if (last.length > 1 && last.length <= 45) {
        source = parts.pop().trim();
        pureTitle = parts.join(" - ").trim();
      }
    }

    if (pureTitle && rawLink) {
      items.push({
        title: pureTitle,
        description: rawDesc,
        link: rawLink,
        pubDate,
        source: source || defaultSource
      });
    }
  }
  return items;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const q = String(req.query?.q || "").trim();
  const region = String(req.query?.region || "Toàn cầu").trim();

  if (!q) {
    return res.status(400).json({ error: "Thiếu từ khóa tìm kiếm (q)", items: [] });
  }

  const endpoints = [
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=vi&gl=VN&ceid=VN:vi`,
      tag: "Google Tin tức"
    },
    {
      url: `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`,
      tag: "Google News Quốc tế"
    },
    {
      url: `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss`,
      tag: "Bing News"
    }
  ];

  const headers = {
    "User-Agent": "Mozilla/5.0 (compatible; GlobalNewsAI/1.0; +https://vercel.app)",
    "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
  };

  try {
    const settled = await Promise.allSettled(
      endpoints.map(async (ep) => {
        const response = await fetch(ep.url, { headers });
        if (!response.ok) return [];
        const xml = await response.text();
        return parseRssXml(xml, ep.tag);
      })
    );

    let allItems = [];
    settled.forEach((r) => {
      if (r.status === "fulfilled" && Array.isArray(r.value)) {
        allItems = allItems.concat(r.value);
      }
    });

    return res.status(200).json({
      query: q,
      region,
      count: allItems.length,
      items: allItems
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message || "Lỗi truy vấn tin tức trên máy chủ Vercel",
      items: []
    });
  }
};
