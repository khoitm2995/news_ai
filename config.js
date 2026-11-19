/**
 * GLOBAL NEWS AI - Cấu hình Hệ thống & Kết nối API
 * Tự động nhận diện môi trường Vercel (/api/ai) để lấy API Key từ Environment Variables.
 */

const isWebServer = typeof window !== "undefined" && window.location.protocol.startsWith("http");

window.GLOBAL_NEWS_CONFIG = {
  // Để trống khi đẩy lên GitHub để bảo mật. Khi deploy Vercel, hệ thống tự gọi /api/ai
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "gemini-3.8-flash",

  OPENAI_API_KEY: "",
  OPENAI_MODEL: "gpt-4o-mini",

  // Tự động gắn "/api/ai" khi chạy trên Vercel hoặc web server
  BACKEND_PROXY_URL: isWebServer ? "/api/ai" : "",

  RSS_FEEDS: [
    {
      id: "bbc-world",
      name: "BBC News",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml",
      defaultCategory: "the-gioi",
      region: "Châu Âu"
    },
    {
      id: "bbc-business",
      name: "BBC Kinh tế",
      url: "https://feeds.bbci.co.uk/news/business/rss.xml",
      defaultCategory: "kinh-te",
      region: "Toàn cầu"
    },
    {
      id: "bbc-tech",
      name: "BBC Công nghệ",
      url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
      defaultCategory: "cong-nghe",
      region: "Toàn cầu"
    },
    {
      id: "aljazeera",
      name: "Al Jazeera",
      url: "https://www.aljazeera.com/xml/rss/all.xml",
      defaultCategory: "chinh-tri",
      region: "Toàn cầu"
    },
    {
      id: "guardian-world",
      name: "The Guardian",
      url: "https://www.theguardian.com/world/rss",
      defaultCategory: "the-gioi",
      region: "Châu Âu"
    },
    {
      id: "nyt-world",
      name: "The New York Times",
      url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
      defaultCategory: "chinh-tri",
      region: "Mỹ"
    },
    {
      id: "espn-news",
      name: "ESPN",
      url: "https://www.espn.com/espn/rss/news",
      defaultCategory: "the-thao",
      region: "Toàn cầu"
    },
    {
      id: "vnexpress-tg",
      name: "VnExpress Quốc tế",
      url: "https://vnexpress.net/rss/the-gioi.rss",
      defaultCategory: "the-gioi",
      region: "Việt Nam"
    },
    {
      id: "vnexpress-kd",
      name: "VnExpress Kinh doanh",
      url: "https://vnexpress.net/rss/kinh-doanh.rss",
      defaultCategory: "kinh-te",
      region: "Việt Nam"
    }
  ],

  SOCIAL_FEEDS: [
    {
      id: "reddit-worldnews",
      platform: "Reddit",
      community: "r/worldnews",
      url: "https://www.reddit.com/r/worldnews/hot.json?limit=12",
      category: "chinh-tri",
      region: "Toàn cầu"
    },
    {
      id: "reddit-technology",
      platform: "Reddit",
      community: "r/technology",
      url: "https://www.reddit.com/r/technology/hot.json?limit=10",
      category: "cong-nghe",
      region: "Toàn cầu"
    },
    {
      id: "reddit-economics",
      platform: "Reddit",
      community: "r/economics",
      url: "https://www.reddit.com/r/economics/hot.json?limit=8",
      category: "kinh-te",
      region: "Toàn cầu"
    },
    {
      id: "reddit-vietnam",
      platform: "Reddit",
      community: "r/VietNam",
      url: "https://www.reddit.com/r/VietNam/hot.json?limit=8",
      category: "xa-hoi",
      region: "Việt Nam"
    }
  ],

  RESTRICTED_SOCIAL_PLATFORMS: [
    {
      platform: "X (Twitter)",
      reason: "X API v2 yêu cầu Bearer Token và máy chủ trung gian (Proxy) do chặn CORS trình duyệt."
    },
    {
      platform: "TikTok",
      reason: "TikTok Research / Display API yêu cầu xác thực OAuth phía máy chủ."
    },
    {
      platform: "Facebook & Instagram",
      reason: "Meta Graph API yêu cầu Access Token ứng dụng đã xét duyệt và backend xử lý."
    },
    {
      platform: "YouTube",
      reason: "Hỗ trợ qua YouTube Data API v3 (có thể cấu hình khóa API hoặc kết nối qua Proxy)."
    },
    {
      platform: "Threads",
      reason: "Threads API yêu cầu mã thông báo người dùng phía máy chủ."
    }
  ],

  CACHE_TTL_MS: 10 * 60 * 1000
};
