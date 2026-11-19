/**
 * GLOBAL NEWS AI - Hệ thống Xử lý Tin tức Quốc tế, Xu hướng Mạng xã hội, Chuyên mục Cá nhân hóa & Trợ lý AI
 * Công nghệ: HTML5, CSS3, Vanilla JavaScript (ES6+)
 * Không dùng dữ liệu tin tức giả lập; toàn bộ dữ liệu được thu thập từ nguồn công khai thật.
 */

(function () {
  "use strict";

  const STORAGE_KEYS = {
    SETTINGS: "global_news_ai_settings_v1",
    SAVED: "global_news_ai_saved_v1",
    HISTORY: "global_news_ai_history_v1",
    ARTICLE_CHATS: "global_news_ai_article_chats_v1",
    WORLD_CHAT: "global_news_ai_world_chat_v1",
    CACHE_NEWS: "global_news_ai_cache_news_v1",
    CACHE_SOCIAL: "global_news_ai_cache_social_v1",
    THEME: "global_news_ai_theme_v1",
    MY_TOPICS: "global_news_ai_my_topics_v1",
    TOPIC_CHATS: "global_news_ai_topic_chats_v1",
    TOPIC_SYNTHESIS: "global_news_ai_topic_synthesis_v1"
  };

  const CATEGORY_LABELS = {
    "trang-chu": "Trang chủ",
    "tin-nong": "Tin nóng",
    "chinh-tri": "Chính trị",
    "kinh-te": "Kinh tế",
    "the-thao": "Thể thao",
    "cong-nghe": "Công nghệ",
    "the-gioi": "Thế giới",
    "mang-xa-hoi": "Tin nóng mạng xã hội",
    "phan-tich-chuyen-sau": "Phân tích chuyên sâu",
    "ban-tin-trong-ngay": "Bản tin trong ngày",
    "tro-ly-ai": "Trợ lý AI Thế giới",
    "quan-ly-chuyen-muc": "Quản lý chuyên mục cá nhân",
    "tin-da-luu": "Tin đã lưu",
    "lich-su-doc": "Lịch sử đọc",
    "cau-hinh-api": "Cấu hình kết nối API"
  };

  const state = {
    currentView: "trang-chu",
    activeTopicId: null,
    activeTopicTab: "tong-quan",
    topicKeywordFilter: "Tất cả",
    searchQuery: "",
    regionFilter: "Tất cả",
    socialRegionFilter: "Toàn cầu",
    socialTopicFilter: "Tất cả",
    articles: [],
    clusters: [],
    socialPosts: [],
    myTopics: [],
    topicFeedCache: {}, // Lưu kết quả truy vấn thời gian thực theo từng topicId
    topicChats: {},
    topicSynthesis: {},
    savedIds: [],
    readHistory: [],
    articleChats: {},
    worldChatHistory: [],
    activeArticle: null,
    lastUpdated: null,
    rssSuccessCount: 0,
    socialSuccessCount: 0,
    isLoadingNews: false,
    isLoadingSocial: false,
    isFetchingTopicId: null,
    dailyBriefingText: "",
    socialAiAnalyses: {},
    // Trạng thái tạm cho modal tạo/sửa chuyên mục
    draftKeywords: [],
    draftEntities: []
  };

  /* ==========================================================================
     1. QUẢN LÝ CÀI ĐẶT & TỰ ĐỘNG NHẬN DIỆN VERCEL ENVIRONMENT
     ========================================================================== */
  let vercelEnvStatus = {
    checked: false,
    configured: false,
    provider: null
  };

  function getSettings() {
    const base = window.GLOBAL_NEWS_CONFIG || {};
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}");
      return {
        geminiKey: (saved.geminiKey || base.GEMINI_API_KEY || "").trim(),
        geminiModel: saved.geminiModel || base.GEMINI_MODEL || "gemini-3.8-flash",
        openaiKey: (saved.openaiKey || base.OPENAI_API_KEY || "").trim(),
        openaiModel: saved.openaiModel || base.OPENAI_MODEL || "gpt-4o-mini",
        proxyUrl: (saved.proxyUrl !== undefined && saved.proxyUrl !== "" ? saved.proxyUrl : base.BACKEND_PROXY_URL || "").trim()
      };
    } catch (e) {
      return {
        geminiKey: base.GEMINI_API_KEY || "",
        geminiModel: base.GEMINI_MODEL || "gemini-3.8-flash",
        openaiKey: base.OPENAI_API_KEY || "",
        openaiModel: base.OPENAI_MODEL || "gpt-4o-mini",
        proxyUrl: base.BACKEND_PROXY_URL || ""
      };
    }
  }

  function saveSettings(newSettings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    updateConnectionIndicators();
  }

  function hasAiKey() {
    const s = getSettings();
    if (s.geminiKey || s.openaiKey) return true;
    if (s.proxyUrl && s.proxyUrl !== "/api/ai") return true;
    return vercelEnvStatus.configured;
  }

  async function detectVercelServerEnv() {
    const s = getSettings();
    if (s.proxyUrl === "/api/ai") {
      try {
        const res = await fetch("/api/ai", { method: "GET" });
        if (res.ok) {
          const info = await res.json();
          vercelEnvStatus = {
            checked: true,
            configured: Boolean(info.configured),
            provider: info.provider || "Vercel Server"
          };
        }
      } catch (e) {
        vercelEnvStatus.checked = true;
        vercelEnvStatus.configured = false;
      }
      updateConnectionIndicators();
      if (state.currentView === "cau-hinh-api") renderCurrentView();
    }
  }

  function loadPersistedUserData() {
    try {
      state.savedIds = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED) || "[]");
      state.readHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || "[]");
      state.articleChats = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARTICLE_CHATS) || "{}");
      state.worldChatHistory = JSON.parse(localStorage.getItem(STORAGE_KEYS.WORLD_CHAT) || "[]");
      state.myTopics = JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_TOPICS) || "[]");
      state.topicChats = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOPIC_CHATS) || "{}");
      state.topicSynthesis = JSON.parse(localStorage.getItem(STORAGE_KEYS.TOPIC_SYNTHESIS) || "{}");
    } catch (e) {
      state.savedIds = [];
      state.readHistory = [];
      state.articleChats = {};
      state.worldChatHistory = [];
      state.myTopics = [];
      state.topicChats = {};
      state.topicSynthesis = {};
    }
  }

  function persistMyTopics() {
    localStorage.setItem(STORAGE_KEYS.MY_TOPICS, JSON.stringify(state.myTopics));
    renderSidebarMyTopics();
    renderRightMyTopicsSummary();
  }

  function persistTopicChats() {
    localStorage.setItem(STORAGE_KEYS.TOPIC_CHATS, JSON.stringify(state.topicChats));
  }

  function persistTopicSynthesis() {
    localStorage.setItem(STORAGE_KEYS.TOPIC_SYNTHESIS, JSON.stringify(state.topicSynthesis));
  }

  function persistSaved() {
    localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(state.savedIds));
    document.getElementById("count-saved").textContent = state.savedIds.length;
  }

  function persistHistory() {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(state.readHistory.slice(0, 60)));
  }

  function persistArticleChats() {
    localStorage.setItem(STORAGE_KEYS.ARTICLE_CHATS, JSON.stringify(state.articleChats));
  }

  function persistWorldChat() {
    localStorage.setItem(STORAGE_KEYS.WORLD_CHAT, JSON.stringify(state.worldChatHistory.slice(-40)));
  }

  /* ==========================================================================
     2. TIỆN ÍCH XỬ LÝ VĂN BẢN, PHÂN LOẠI & NHÓM SỰ KIỆN
     ========================================================================== */
  function stripHtml(html) {
    if (!html) return "";
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatRelativeTime(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Vừa cập nhật";
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "Vừa xong";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} giờ trước`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function classifyArticle(title, desc, fallbackCat) {
    const text = `${title} ${desc}`.toLowerCase();
    if (/(football|premier league|champions league|world cup|fifa|tennis|nba|f1|wwe|wrestling|bóng đá|ngoại hạng|thể thao|olympic|uefa|messi|ronaldo)/i.test(text)) {
      return "the-thao";
    }
    if (/(ai\b|artificial intelligence|openai|google|apple|microsoft|nvidia|chip|semiconductor|cyber|space|nasa|trí tuệ nhân tạo|công nghệ|bán dẫn|vũ trụ|an ninh mạng)/i.test(text)) {
      return "cong-nghe";
    }
    if (/(economy|market|stock|inflation|bank|fed|tariff|oil|gold|trade|gdp|crypto|bitcoin|kinh tế|chứng khoán|lãi suất|ngân hàng|thuế quan|giá vàng|giá dầu|thương mại)/i.test(text)) {
      return "kinh-te";
    }
    if (/(election|president|minister|parliament|diplomat|military|war|ukraine|russia|nato|sanction|treaty|bầu cử|tổng thống|thủ tướng|quốc hội|ngoại giao|quân sự|xung đột|chính phủ|chính trị)/i.test(text)) {
      return "chinh-tri";
    }
    return fallbackCat || "the-gioi";
  }

  function detectRegion(title, desc, defaultRegion) {
    const text = `${title} ${desc}`.toLowerCase();
    if (/(vietnam|việt nam|hà nội|tp\.hcm|hồ chí minh|mekong)/i.test(text)) return "Việt Nam";
    if (/(u\.s\.|usa|united states|washington|white house|trump|biden|mỹ|hoa kỳ)/i.test(text)) return "Mỹ";
    if (/(china|beijing|xi jinping|taiwan|trung quốc|bắc kinh)/i.test(text)) return "Trung Quốc";
    if (/(europe|eu|uk|britain|france|germany|ukraine|russia|châu âu|anh|pháp|đức|nga)/i.test(text)) return "Châu Âu";
    if (/(japan|korea|india|asean|asia|nhật bản|hàn quốc|ấn độ|châu á)/i.test(text)) return "Châu Á";
    return defaultRegion || "Toàn cầu";
  }

  function isBreakingStory(pubDate, title) {
    const ageHours = (Date.now() - new Date(pubDate).getTime()) / 3600000;
    const urgentKeyword = /(breaking|urgent|alert|war|attack|crisis|emergency|crash|earthquake|khẩn|nóng|xung đột|động đất|khủng hoảng)/i.test(title);
    return (ageHours >= 0 && ageHours <= 4) || (ageHours <= 10 && urgentKeyword);
  }

  function buildFallbackImage(sourceName, category) {
    const colors = {
      "chinh-tri": "#101828",
      "kinh-te": "#175CD3",
      "the-thao": "#039855",
      "cong-nghe": "#1D2939",
      "the-gioi": "#344054"
    };
    const bg = colors[category] || "#101828";
    const label = encodeURIComponent(sourceName || "GLOBAL NEWS AI");
    return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='100%25' height='100%25' fill='${encodeURIComponent(bg)}'/><text x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' fill='%23FFFFFF' font-family='sans-serif' font-size='28' font-weight='bold'>${label}</text><text x='50%25' y='58%25' dominant-baseline='middle' text-anchor='middle' fill='%2398A2B3' font-family='sans-serif' font-size='15'>GLOBAL NEWS AI • BẢN TIN QUỐC TẾ</text></svg>`;
  }

  // Nhóm các bài báo từ nhiều nguồn nói về cùng một sự kiện
  function clusterArticles(articles) {
    const clusters = [];
    const stopWords = new Set(["the", "and", "for", "with", "that", "from", "this", "will", "have", "after", "over", "into", "about", "says", "news", "world", "của", "và", "các", "trong", "cho", "với", "từ", "sau", "khi", "đã", "đang"]);

    function getTokens(str) {
      return new Set(
        str
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3 && !stopWords.has(w))
      );
    }

    articles.forEach((article) => {
      const tokens = getTokens(article.title);
      let matchedCluster = null;

      for (const cluster of clusters) {
        let overlap = 0;
        tokens.forEach((t) => {
          if (cluster.tokens.has(t)) overlap++;
        });
        const minLen = Math.min(tokens.size, cluster.tokens.size);
        if (minLen > 0 && overlap >= 3 && overlap / minLen >= 0.35) {
          matchedCluster = cluster;
          break;
        }
      }

      if (matchedCluster) {
        if (!matchedCluster.sources.includes(article.source)) {
          matchedCluster.sources.push(article.source);
        }
        matchedCluster.articles.push(article);
      } else {
        clusters.push({
          id: "cluster-" + article.id,
          topicTitle: article.title,
          category: article.category,
          region: article.region,
          tokens,
          sources: [article.source],
          articles: [article],
          latestDate: article.pubDate
        });
      }
    });

    return clusters.sort((a, b) => b.articles.length - a.articles.length || new Date(b.latestDate) - new Date(a.latestDate));
  }

  /* ==========================================================================
     3. THU THẬP DỮ LIỆU THẬT TỪ RSS QUỐC TẾ & REDDIT API CÔNG KHAI
     ========================================================================== */
  async function fetchSingleRssFeed(feed) {
    const rss2jsonEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
    const allOriginsEndpoint = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;

    try {
      const res = await fetch(rss2jsonEndpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok" && Array.isArray(data.items) && data.items.length > 0) {
          return data.items.slice(0, 12).map((item, idx) => {
            const cleanDesc = stripHtml(item.description || item.content || "");
            const category = classifyArticle(item.title, cleanDesc, feed.defaultCategory);
            const region = detectRegion(item.title, cleanDesc, feed.region);
            const img = item.thumbnail || (item.enclosure && item.enclosure.link) || buildFallbackImage(feed.name, category);
            return {
              id: `${feed.id}-${btoa(unescape(encodeURIComponent(item.link || item.title + idx))).slice(0, 18)}`,
              title: stripHtml(item.title),
              description: cleanDesc || "Nhấn để đọc nội dung chi tiết hoặc yêu cầu AI tóm tắt và phân tích sự kiện này.",
              fullContent: stripHtml(item.content || item.description || ""),
              link: item.link,
              pubDate: item.pubDate || new Date().toISOString(),
              source: feed.name,
              author: item.author || feed.name,
              image: img,
              category,
              region,
              isBreaking: isBreakingStory(item.pubDate, item.title)
            };
          });
        }
      }
    } catch (err) {}

    try {
      const resXml = await fetch(allOriginsEndpoint);
      if (!resXml.ok) return [];
      const payload = await resXml.json();
      if (!payload.contents) return [];
      const parser = new DOMParser();
      const xml = parser.parseFromString(payload.contents, "text/xml");
      const items = Array.from(xml.querySelectorAll("item")).slice(0, 12);

      return items.map((node, idx) => {
        const title = stripHtml(node.querySelector("title")?.textContent || "");
        const descRaw = node.querySelector("description")?.textContent || "";
        const cleanDesc = stripHtml(descRaw);
        const link = node.querySelector("link")?.textContent?.trim() || "";
        const pubDate = node.querySelector("pubDate")?.textContent || new Date().toISOString();
        const media = node.querySelector("media\\:content, content, enclosure");
        const mediaUrl = media ? media.getAttribute("url") : "";
        const category = classifyArticle(title, cleanDesc, feed.defaultCategory);
        const region = detectRegion(title, cleanDesc, feed.region);

        return {
          id: `${feed.id}-xml-${idx}-${title.length}`,
          title,
          description: cleanDesc || "Bản tin quốc tế cập nhật từ " + feed.name,
          fullContent: cleanDesc,
          link,
          pubDate,
          source: feed.name,
          author: feed.name,
          image: mediaUrl || buildFallbackImage(feed.name, category),
          category,
          region,
          isBreaking: isBreakingStory(pubDate, title)
        };
      });
    } catch (err2) {
      return [];
    }
  }

  async function loadAllNews(forceRefresh = false) {
    const config = window.GLOBAL_NEWS_CONFIG;
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE_NEWS) || "null");
        if (cached && Date.now() - cached.timestamp < config.CACHE_TTL_MS && cached.articles?.length > 0) {
          state.articles = cached.articles;
          state.clusters = clusterArticles(state.articles);
          state.rssSuccessCount = cached.successCount || 1;
          state.lastUpdated = new Date(cached.timestamp);
          updateHeaderAndSidebarStats();
          renderCurrentView();
          return;
        }
      } catch (e) {}
    }

    state.isLoadingNews = true;
    renderCurrentView();

    const results = await Promise.allSettled(config.RSS_FEEDS.map((f) => fetchSingleRssFeed(f)));
    let collected = [];
    let okFeeds = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && Array.isArray(r.value) && r.value.length > 0) {
        okFeeds++;
        collected = collected.concat(r.value);
      }
    });

    const seenTitles = new Set();
    const uniqueArticles = [];
    collected
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .forEach((art) => {
        const key = art.title.toLowerCase().slice(0, 55);
        if (art.title && !seenTitles.has(key)) {
          seenTitles.add(key);
          uniqueArticles.push(art);
        }
      });

    state.articles = uniqueArticles;
    state.clusters = clusterArticles(uniqueArticles);
    state.rssSuccessCount = okFeeds;
    state.lastUpdated = new Date();
    state.isLoadingNews = false;

    if (uniqueArticles.length > 0) {
      localStorage.setItem(
        STORAGE_KEYS.CACHE_NEWS,
        JSON.stringify({
          timestamp: Date.now(),
          articles: uniqueArticles,
          successCount: okFeeds
        })
      );
    }

    updateHeaderAndSidebarStats();
    renderCurrentView();
  }

  async function loadSocialTrends(forceRefresh = false) {
    const config = window.GLOBAL_NEWS_CONFIG;
    if (!forceRefresh) {
      try {
        const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE_SOCIAL) || "null");
        if (cached && Date.now() - cached.timestamp < config.CACHE_TTL_MS && cached.posts?.length > 0) {
          state.socialPosts = cached.posts;
          state.socialSuccessCount = cached.successCount || 1;
          updateHeaderAndSidebarStats();
          renderCurrentView();
          return;
        }
      } catch (e) {}
    }

    state.isLoadingSocial = true;
    const promises = config.SOCIAL_FEEDS.map(async (feed) => {
      try {
        const res = await fetch(feed.url, { headers: { Accept: "application/json" } });
        if (!res.ok) return [];
        const json = await res.json();
        const children = json?.data?.children || [];
        return children
          .filter((c) => c.data && !c.data.stickied)
          .map((c) => {
            const d = c.data;
            const thumb = d.thumbnail && d.thumbnail.startsWith("http") ? d.thumbnail : "";
            const region = detectRegion(d.title, d.selftext || "", feed.region);
            const category = classifyArticle(d.title, d.selftext || "", feed.category);
            return {
              id: "soc-" + d.id,
              platform: "Reddit",
              community: feed.community,
              author: d.author ? `u/${d.author}` : "Thành viên cộng đồng",
              title: d.title,
              summary: d.selftext ? d.selftext.slice(0, 260) : `Thảo luận nổi bật tại cộng đồng ${feed.community} (nguồn dẫn: ${d.domain || "Reddit"}).`,
              image: thumb,
              createdAt: new Date(d.created_utc * 1000).toISOString(),
              upvotes: typeof d.ups === "number" ? d.ups : null,
              commentsCount: typeof d.num_comments === "number" ? d.num_comments : null,
              permalink: `https://www.reddit.com${d.permalink}`,
              externalDomain: d.domain || "reddit.com",
              isVideo: Boolean(d.is_video || /(youtube\.com|youtu\.be|v\.redd\.it|tiktok\.com)/i.test(d.domain || "")),
              category,
              region,
              trendLabel: d.ups > 5000 ? "Lan truyền mạnh" : d.num_comments > 300 ? "Tranh luận sôi nổi" : "Đang thịnh hành"
            };
          });
      } catch (e) {
        return [];
      }
    });

    const settled = await Promise.all(promises);
    let allPosts = [];
    let okCommunities = 0;
    settled.forEach((arr) => {
      if (arr.length > 0) okCommunities++;
      allPosts = allPosts.concat(arr);
    });

    allPosts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    state.socialPosts = allPosts;
    state.socialSuccessCount = okCommunities;
    state.isLoadingSocial = false;

    if (allPosts.length > 0) {
      localStorage.setItem(
        STORAGE_KEYS.CACHE_SOCIAL,
        JSON.stringify({
          timestamp: Date.now(),
          posts: allPosts,
          successCount: okCommunities
        })
      );
    }

    updateHeaderAndSidebarStats();
    renderCurrentView();
  }

  /* ==========================================================================
     4. KẾT NỐI TRÍ TUỆ NHÂN TẠO (ƯU TIÊN VERCEL ENV -> LOCAL KEY)
     ========================================================================== */
  async function callAiAssistant({ systemPrompt, userPrompt, history = [] }) {
    const settings = getSettings();

    if (settings.proxyUrl && !settings.geminiKey && !settings.openaiKey) {
      const proxyRes = await fetch(settings.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, userPrompt, history })
      });
      const proxyData = await proxyRes.json().catch(() => ({}));
      if (!proxyRes.ok) {
        if (proxyData.error === "CHUA_CAU_HINH_VERCEL_ENV") {
          throw new Error("CHUA_CAU_HINH_API");
        }
        throw new Error(proxyData.error || `Máy chủ Proxy trả về lỗi HTTP ${proxyRes.status}`);
      }
      return proxyData.text || proxyData.reply || JSON.stringify(proxyData);
    }

    if (!settings.geminiKey && !settings.openaiKey) {
      throw new Error("CHUA_CAU_HINH_API");
    }

    if (settings.geminiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.geminiModel)}:generateContent?key=${encodeURIComponent(settings.geminiKey)}`;

      const contents = [];
      history.slice(-8).forEach((msg) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      });
      contents.push({
        role: "user",
        parts: [{ text: userPrompt }]
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents,
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1600
          }
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Lỗi Gemini API (${response.status}): ${errBody.slice(0, 180)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n");
      if (!text) throw new Error("Gemini không trả về nội dung phản hồi.");
      return text;
    }

    if (settings.openaiKey) {
      const messages = [{ role: "system", content: systemPrompt }];
      history.slice(-8).forEach((msg) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text
        });
      });
      messages.push({ role: "user", content: userPrompt });

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.openaiKey}`
        },
        body: JSON.stringify({
          model: settings.openaiModel,
          messages,
          temperature: 0.35
        })
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Lỗi OpenAI API (${response.status}): ${errBody.slice(0, 180)}`);
      }

      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "Không nhận được phản hồi từ OpenAI.";
    }
  }

  /* ==========================================================================
     5. HỆ THỐNG CHUYÊN MỤC CÁ NHÂN HÓA (MY TOPICS) - THU THẬP THẬT & AI
     ========================================================================== */
  function getSortedTopics() {
    return [...state.myTopics].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
      return (a.order || 0) - (b.order || 0);
    });
  }

  function renderSidebarMyTopics() {
    const listEl = document.getElementById("my-topics-sidebar-list");
    const countEl = document.getElementById("count-my-topics");
    const sorted = getSortedTopics();
    countEl.textContent = sorted.length;

    if (sorted.length === 0) {
      listEl.innerHTML = `<div class="muted-small" style="padding:4px 10px;">Chưa có chuyên mục riêng</div>`;
      return;
    }

    listEl.innerHTML = sorted
      .map((t) => {
        const isActive = state.currentView === "chuyen-muc-ca-nhan" && state.activeTopicId === t.id;
        const cachedCount = state.topicFeedCache[t.id]?.articles?.length || 0;
        return `
          <button class="nav-item ${isActive ? "active" : ""}" data-open-my-topic="${escapeHtml(t.id)}">
            <span class="nav-icon">${t.pinned ? "📌" : "🏷️"}</span>
            <span class="nav-label-truncate">${escapeHtml(t.name)}</span>
            ${cachedCount > 0 ? `<span class="nav-badge badge-blue">${cachedCount}</span>` : ""}
          </button>`;
      })
      .join("");
  }

  function renderRightMyTopicsSummary() {
    const box = document.getElementById("right-my-topics-summary");
    if (!box) return;
    const sorted = getSortedTopics();
    if (sorted.length === 0) {
      box.innerHTML = `<p class="muted-small">Tạo chuyên mục riêng (ví dụ: Đô vật Mỹ, Trí tuệ nhân tạo, Bóng đá Ngoại hạng Anh) để hệ thống tự động gom tin theo từ khóa.</p>`;
      return;
    }
    box.innerHTML = sorted
      .slice(0, 4)
      .map(
        (t) => `
        <div class="cluster-item" data-open-my-topic="${escapeHtml(t.id)}">
          <div class="cluster-title">${t.pinned ? "📌 " : ""}${escapeHtml(t.name)}</div>
          <div class="cluster-meta">
            <span>${t.keywords.length} từ khóa • ${escapeHtml(t.region)}</span>
            <span>Mở →</span>
          </div>
        </div>`
      )
      .join("");
  }

  // Truy vấn dữ liệu thật cho chuyên mục cá nhân từ Google News RSS + Reddit Search API + Kho tin tòa soạn
  async function fetchLiveContentForTopic(topic, forceRefresh = false) {
    if (!topic) return;
    const existing = state.topicFeedCache[topic.id];
    if (!forceRefresh && existing && Date.now() - existing.timestamp < 5 * 60 * 1000) {
      return existing;
    }

    state.isFetchingTopicId = topic.id;
    renderCurrentView();

    const terms = [...new Set([topic.name, ...(topic.keywords || []), ...(topic.entities || [])])]
      .map((s) => s.trim())
      .filter(Boolean);

    const lowerTerms = terms.map((t) => t.toLowerCase());

    // 1. Lọc ngữ nghĩa từ kho bài báo quốc tế hiện có trên tòa soạn
    const matchedLocalArticles = state.articles.filter((art) => {
      const text = `${art.title} ${art.description}`.toLowerCase();
      return lowerTerms.some((term) => text.includes(term));
    });

    // 2. Truy vấn thời gian thực từ Google News RSS theo bộ từ khóa của chuyên mục
    let fetchedPressArticles = [];
    if (topic.sources?.press !== false && terms.length > 0) {
      const queryTerms = terms.slice(0, 5).map((t) => `"${t}"`).join(" OR ");
      const googleNewsRss = `https://news.google.com/rss/search?q=${encodeURIComponent(queryTerms)}&hl=vi&gl=VN&ceid=VN:vi`;
      const googleNewsEnRss = `https://news.google.com/rss/search?q=${encodeURIComponent(queryTerms)}&hl=en-US&gl=US&ceid=US:en`;

      const queries = [googleNewsRss];
      if (topic.region !== "Việt Nam") queries.push(googleNewsEnRss);

      const pressResults = await Promise.allSettled(
        queries.map(async (rssUrl, qIdx) => {
          const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
          const res = await fetch(api);
          if (!res.ok) return [];
          const data = await res.json();
          if (data.status !== "ok" || !Array.isArray(data.items)) return [];
          return data.items.slice(0, 12).map((item, idx) => {
            const cleanTitle = stripHtml(item.title);
            const parts = cleanTitle.split(" - ");
            const publisher = parts.length > 1 ? parts.pop() : qIdx === 0 ? "Google Tin tức" : "Global News Wire";
            const pureTitle = parts.join(" - ") || cleanTitle;
            const cleanDesc = stripHtml(item.description || "");
            return {
              id: `topic-press-${topic.id}-${qIdx}-${idx}-${pureTitle.length}`,
              title: pureTitle,
              description: cleanDesc || `Tin tức liên quan đến chuyên mục ${topic.name} từ ${publisher}.`,
              fullContent: cleanDesc,
              link: item.link,
              pubDate: item.pubDate || new Date().toISOString(),
              source: publisher,
              author: publisher,
              image: item.thumbnail || buildFallbackImage(publisher, "the-gioi"),
              category: classifyArticle(pureTitle, cleanDesc, "the-gioi"),
              region: topic.region || "Toàn cầu",
              isBreaking: isBreakingStory(item.pubDate, pureTitle)
            };
          });
        })
      );

      pressResults.forEach((r) => {
        if (r.status === "fulfilled") fetchedPressArticles = fetchedPressArticles.concat(r.value);
      });
    }

    // Hợp nhất & khử trùng lặp bài báo
    const allTopicArticlesRaw = [...matchedLocalArticles, ...fetchedPressArticles];
    const seen = new Set();
    const uniqueTopicArticles = [];
    allTopicArticlesRaw
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .forEach((art) => {
        const key = art.title.toLowerCase().slice(0, 52);
        if (!seen.has(key)) {
          seen.add(key);
          uniqueTopicArticles.push(art);
          // Đưa vào kho bài báo chung để người dùng có thể mở đọc chi tiết & chat AI
          if (!state.articles.some((existingArt) => existingArt.id === art.id)) {
            state.articles.push(art);
          }
        }
      });

    // 3. Truy vấn thời gian thực từ Reddit Search API công khai cho Mạng xã hội & Video
    let topicSocialPosts = [];
    if ((topic.sources?.social !== false || topic.sources?.video !== false) && terms.length > 0) {
      const searchStr = terms.slice(0, 4).join(" OR ");
      try {
        const redditUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(searchStr)}&sort=relevance&t=week&limit=16`;
        const res = await fetch(redditUrl, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const json = await res.json();
          const children = json?.data?.children || [];
          topicSocialPosts = children
            .filter((c) => c.data)
            .map((c) => {
              const d = c.data;
              const thumb = d.thumbnail && d.thumbnail.startsWith("http") ? d.thumbnail : "";
              const isVid = Boolean(
                d.is_video ||
                  /(youtube\.com|youtu\.be|v\.redd\.it|tiktok\.com|twitch\.tv)/i.test(d.domain || "") ||
                  /(youtube\.com|youtu\.be)/i.test(d.url || "")
              );
              return {
                id: `topic-soc-${topic.id}-${d.id}`,
                platform: "Reddit",
                community: d.subreddit_name_prefixed || "r/all",
                author: d.author ? `u/${d.author}` : "Thành viên cộng đồng",
                title: d.title,
                summary: d.selftext ? d.selftext.slice(0, 260) : `Thảo luận tại ${d.subreddit_name_prefixed || "Reddit"} (nguồn: ${d.domain || "reddit.com"}).`,
                image: thumb,
                createdAt: new Date(d.created_utc * 1000).toISOString(),
                upvotes: typeof d.ups === "number" ? d.ups : 0,
                commentsCount: typeof d.num_comments === "number" ? d.num_comments : 0,
                permalink: `https://www.reddit.com${d.permalink}`,
                externalUrl: d.url || `https://www.reddit.com${d.permalink}`,
                externalDomain: d.domain || "reddit.com",
                isVideo: isVid,
                region: topic.region || "Toàn cầu",
                trendLabel: d.ups > 3000 ? "Lan truyền mạnh" : "Đang thảo luận"
              };
            });
        }
      } catch (e) {}
    }

    // Lọc thêm từ kho socialPosts hiện có
    const matchedLocalSocial = state.socialPosts.filter((p) => {
      const txt = `${p.title} ${p.summary}`.toLowerCase();
      return lowerTerms.some((term) => txt.includes(term));
    });

    const mergedSocialMap = new Map();
    [...matchedLocalSocial, ...topicSocialPosts].forEach((p) => {
      if (!mergedSocialMap.has(p.title.toLowerCase().slice(0, 50))) {
        mergedSocialMap.set(p.title.toLowerCase().slice(0, 50), p);
      }
    });

    const finalSocial = Array.from(mergedSocialMap.values()).sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    const finalVideos = finalSocial.filter((p) => p.isVideo);
    const topicClusters = clusterArticles(uniqueTopicArticles);

    const bundle = {
      timestamp: Date.now(),
      articles: topic.sources?.press === false ? [] : uniqueTopicArticles,
      social: topic.sources?.social === false ? [] : finalSocial,
      videos: topic.sources?.video === false ? [] : finalVideos,
      clusters: topicClusters
    };

    state.topicFeedCache[topic.id] = bundle;
    state.isFetchingTopicId = null;
    renderSidebarMyTopics();
    renderCurrentView();
    return bundle;
  }

  // Modal Tạo / Chỉnh sửa chuyên mục
  function openTopicEditorModal(topicToEdit = null) {
    const modal = document.getElementById("topic-editor-modal");
    const titleEl = document.getElementById("topic-modal-title");
    const idInput = document.getElementById("topic-edit-id");
    const nameInput = document.getElementById("topic-name-input");
    const descInput = document.getElementById("topic-desc-input");
    const regionSelect = document.getElementById("topic-region-select");
    const srcPress = document.getElementById("src-press");
    const srcSocial = document.getElementById("src-social");
    const srcVideo = document.getElementById("src-video");
    const optNotify = document.getElementById("opt-notify-latest");
    const optPinned = document.getElementById("opt-pinned");

    if (topicToEdit) {
      titleEl.textContent = `✏️ Chỉnh sửa chuyên mục: ${topicToEdit.name}`;
      idInput.value = topicToEdit.id;
      nameInput.value = topicToEdit.name;
      descInput.value = topicToEdit.description || "";
      regionSelect.value = topicToEdit.region || "Toàn cầu";
      state.draftKeywords = [...(topicToEdit.keywords || [])];
      state.draftEntities = [...(topicToEdit.entities || [])];
      srcPress.checked = topicToEdit.sources?.press !== false;
      srcSocial.checked = topicToEdit.sources?.social !== false;
      srcVideo.checked = topicToEdit.sources?.video !== false;
      optNotify.checked = topicToEdit.notifyLatest !== false;
      optPinned.checked = Boolean(topicToEdit.pinned);
    } else {
      titleEl.textContent = "✨ Tạo chuyên mục cá nhân mới";
      idInput.value = "";
      nameInput.value = "";
      descInput.value = "";
      regionSelect.value = "Toàn cầu";
      state.draftKeywords = [];
      state.draftEntities = [];
      srcPress.checked = true;
      srcSocial.checked = true;
      srcVideo.checked = true;
      optNotify.checked = true;
      optPinned.checked = false;
    }

    renderDraftChips();
    modal.classList.remove("hidden");
    nameInput.focus();
  }

  function renderDraftChips() {
    const kwBox = document.getElementById("topic-keywords-list");
    const entBox = document.getElementById("topic-entities-list");

    if (state.draftKeywords.length === 0) {
      kwBox.innerHTML = `<span class="muted-small">Chưa có từ khóa nào. Hãy thêm từ khóa hoặc dùng AI đề xuất.</span>`;
    } else {
      kwBox.innerHTML = state.draftKeywords
        .map(
          (kw, idx) => `
          <span class="editable-chip">
            <span>${escapeHtml(kw)}</span>
            <button type="button" data-remove-draft-kw="${idx}" title="Xóa từ khóa">✕</button>
          </span>`
        )
        .join("");
    }

    if (state.draftEntities.length === 0) {
      entBox.innerHTML = `<span class="muted-small">Chưa có nhân vật hoặc tổ chức nào được gắn thẻ.</span>`;
    } else {
      entBox.innerHTML = state.draftEntities
        .map(
          (ent, idx) => `
          <span class="editable-chip" style="background:var(--gray-bg);color:var(--text-primary);border-color:var(--border-color);">
            <span>👤 ${escapeHtml(ent)}</span>
            <button type="button" data-remove-draft-ent="${idx}" title="Xóa đối tượng">✕</button>
          </span>`
        )
        .join("");
    }
  }

  async function handleAiSuggestKeywords() {
    const topicName = document.getElementById("topic-name-input").value.trim();
    const topicDesc = document.getElementById("topic-desc-input").value.trim();
    const region = document.getElementById("topic-region-select").value;

    if (!topicName) {
      showToast("Vui lòng nhập Tên chuyên mục trước khi nhờ AI đề xuất từ khóa.");
      document.getElementById("topic-name-input").focus();
      return;
    }

    const btn = document.getElementById("ai-suggest-keywords-btn");
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "⏳ Đang gợi ý...";

    const systemPrompt = `Bạn là Trợ lý Biên tập của GLOBAL NEWS AI.
Hãy đề xuất bộ từ khóa tìm kiếm tin tức quốc tế (cả tiếng Anh chuẩn quốc tế và tiếng Việt nếu phù hợp) và các nhân vật/tổ chức/sự kiện tiêu biểu cho chuyên mục người dùng yêu cầu.
Trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng định dạng sau, không kèm markdown hay giải thích thêm:
{
  "description": "Mô tả ngắn gọn 1 câu bằng tiếng Việt cho chuyên mục này",
  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3", "từ khóa 4", "từ khóa 5", "từ khóa 6"],
  "entities": ["Nhân vật/Tổ chức 1", "Nhân vật/Tổ chức 2", "Sự kiện 3", "Nhân vật 4"]
}`;

    const userPrompt = `Tên chuyên mục: ${topicName}
Mô tả hiện có: ${topicDesc || "Chưa có"}
Phạm vi địa lý: ${region}`;

    try {
      const raw = await callAiAssistant({ systemPrompt, userPrompt });
      const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed.keywords)) {
        parsed.keywords.forEach((k) => {
          const val = String(k).trim();
          if (val && !state.draftKeywords.includes(val)) state.draftKeywords.push(val);
        });
      }
      if (Array.isArray(parsed.entities)) {
        parsed.entities.forEach((e) => {
          const val = String(e).trim();
          if (val && !state.draftEntities.includes(val)) state.draftEntities.push(val);
        });
      }
      if (parsed.description && !document.getElementById("topic-desc-input").value.trim()) {
        document.getElementById("topic-desc-input").value = parsed.description;
      }

      renderDraftChips();
      showToast("AI đã đề xuất bộ từ khóa và nhân vật liên quan!");
    } catch (err) {
      if (err.message === "CHUA_CAU_HINH_API") {
        showToast("Chưa cấu hình khóa AI. Bạn vẫn có thể tự nhập từ khóa thủ công bên dưới.");
      } else {
        showToast("Không thể phân tích phản hồi AI: " + err.message);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  /* ==========================================================================
     6. RENDER TRANG RIÊNG CỦA CHUYÊN MỤC CÁ NHÂN (6 TAB ĐẦY ĐỦ)
     ========================================================================== */
  function renderCustomTopicView(topicId) {
    const topic = state.myTopics.find((t) => t.id === topicId);
    if (!topic) {
      return `<div class="panel-card"><h3>Chuyên mục không tồn tại hoặc đã bị xóa.</h3></div>`;
    }

    const bundle = state.topicFeedCache[topic.id] || {
      articles: [],
      social: [],
      videos: [],
      clusters: []
    };
    const isFetching = state.isFetchingTopicId === topic.id;
    const allTerms = [...(topic.keywords || []), ...(topic.entities || [])];

    // Áp dụng bộ lọc từ khóa nội bộ trong trang chuyên mục
    const kwFilter = state.topicKeywordFilter;
    const filterByKw = (text) => {
      if (!kwFilter || kwFilter === "Tất cả") return true;
      return text.toLowerCase().includes(kwFilter.toLowerCase());
    };

    const filteredArticles = bundle.articles.filter((a) => filterByKw(`${a.title} ${a.description}`));
    const filteredSocial = bundle.social.filter((s) => filterByKw(`${s.title} ${s.summary}`));
    const filteredVideos = bundle.videos.filter((v) => filterByKw(`${v.title} ${v.summary}`));

    const tabs = [
      { id: "tong-quan", label: "📊 Tổng quan", count: filteredArticles.length + filteredSocial.length },
      { id: "bao-chi", label: "📰 Báo chí", count: filteredArticles.length },
      { id: "mang-xa-hoi", label: "📱 Mạng xã hội", count: filteredSocial.length },
      { id: "video", label: "🎬 Video", count: filteredVideos.length },
      { id: "phan-tich-ai", label: "🧭 Phân tích AI", count: null },
      { id: "chat-ai", label: "💬 Chat AI chuyên mục", count: (state.topicChats[topic.id] || []).length }
    ];

    let tabBodyHtml = "";

    if (isFetching && filteredArticles.length === 0 && filteredSocial.length === 0) {
      tabBodyHtml = `
        <div class="panel-card">
          <h3>⏳ Đang truy vấn dữ liệu thời gian thực cho "${escapeHtml(topic.name)}"...</h3>
          <p class="muted-small" style="margin-bottom:12px;">Hệ thống đang đối chiếu bộ từ khóa (${escapeHtml(allTerms.join(", ") || topic.name)}) trên các hãng thông tấn quốc tế và cộng đồng trực tuyến.</p>
          <div class="skeleton-line" style="height:160px;margin-bottom:10px;"></div>
          <div class="skeleton-line" style="width:65%;"></div>
        </div>
      `;
    } else if (state.activeTopicTab === "tong-quan") {
      tabBodyHtml = `
        ${
          bundle.clusters.length > 0
            ? `<div class="panel-card" style="padding:14px 16px;">
                <h4 style="font-size:0.92rem;margin-bottom:8px;">🔗 Sự kiện nổi bật được gom nhóm đa nguồn (${bundle.clusters.slice(0, 3).length} cụm)</h4>
                ${bundle.clusters
                  .slice(0, 3)
                  .map(
                    (c) => `
                    <div style="padding:8px 0;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:10px;">
                      <div>
                        <strong style="font-size:0.86rem;cursor:pointer;" data-open-article="${escapeHtml(c.articles[0].id)}">${escapeHtml(c.topicTitle)}</strong>
                        <div class="muted-small">Nguồn đưa tin: ${escapeHtml(c.sources.join(", "))}</div>
                      </div>
                      <button class="mini-action-btn ai-ask" data-open-article-ai="${escapeHtml(c.articles[0].id)}">Hỏi AI</button>
                    </div>`
                  )
                  .join("")}
              </div>`
            : ""
        }

        <div class="section-header">
          <h3 class="section-title">📰 Tin báo chí liên quan (${filteredArticles.length})</h3>
          <button class="link-btn" data-topic-tab="bao-chi">Xem tất cả báo chí →</button>
        </div>
        ${
          filteredArticles.length === 0
            ? `<div class="panel-card"><p class="muted-small">Chưa tìm thấy bài báo nào khớp trực tiếp với từ khóa hiện tại. Bạn có thể bổ sung thêm từ khóa tiếng Anh/tiếng Việt hoặc nhấn "Làm mới dữ liệu".</p></div>`
            : `<div class="news-grid">${filteredArticles.slice(0, 6).map(renderArticleCard).join("")}</div>`
        }

        <div class="section-header">
          <h3 class="section-title">📱 Thảo luận &amp; Xu hướng Mạng xã hội (${filteredSocial.length})</h3>
          <button class="link-btn" data-topic-tab="mang-xa-hoi">Xem tất cả thảo luận →</button>
        </div>
        ${
          filteredSocial.length === 0
            ? `<div class="panel-card"><p class="muted-small">Chưa ghi nhận bài đăng mạng xã hội công khai khớp với bộ lọc từ khóa này.</p></div>`
            : `<div class="social-grid">${filteredSocial.slice(0, 4).map(renderTopicSocialCard).join("")}</div>`
        }
      `;
    } else if (state.activeTopicTab === "bao-chi") {
      tabBodyHtml =
        filteredArticles.length === 0
          ? `<div class="panel-card"><p class="muted-small">Không có bài báo nào khớp với bộ lọc từ khóa.</p></div>`
          : `<div class="news-grid">${filteredArticles.map(renderArticleCard).join("")}</div>`;
    } else if (state.activeTopicTab === "mang-xa-hoi") {
      tabBodyHtml =
        filteredSocial.length === 0
          ? `<div class="panel-card"><p class="muted-small">Không có bài đăng mạng xã hội nào khớp với bộ lọc từ khóa.</p></div>`
          : `<div class="social-grid">${filteredSocial.map(renderTopicSocialCard).join("")}</div>`;
    } else if (state.activeTopicTab === "video") {
      tabBodyHtml = `
        <div class="panel-card" style="padding:12px 16px;">
          <p class="muted-small">Tổng hợp các liên kết video &amp; clip thảo luận thực tế tìm thấy theo từ khóa của chuyên mục <strong>${escapeHtml(topic.name)}</strong> (không tạo video giả lập).</p>
        </div>
        ${
          filteredVideos.length === 0
            ? `<div class="panel-card"><p class="muted-small">Chưa có liên kết video công khai mới trong tuần qua cho bộ từ khóa này. Bạn có thể chuyển sang tab "Mạng xã hội" hoặc mở rộng từ khóa.</p></div>`
            : `<div class="social-grid">${filteredVideos.map(renderTopicSocialCard).join("")}</div>`
        }
      `;
    } else if (state.activeTopicTab === "phan-tich-ai") {
      const synthesis = state.topicSynthesis[topic.id] || "";
      tabBodyHtml = `
        <div class="panel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
            <div>
              <h3 style="font-size:1.05rem;">🧭 Báo cáo Tổng hợp &amp; Kiểm chứng Chuyên mục "${escapeHtml(topic.name)}"</h3>
              <p class="muted-small">AI phân tích toàn bộ ${filteredArticles.length} bài báo và ${filteredSocial.length} thảo luận cộng đồng đã thu thập.</p>
            </div>
            <button class="btn btn-ai-sm" data-run-topic-synthesis="${escapeHtml(topic.id)}">✦ Tạo báo cáo phân tích AI</button>
          </div>
          <div style="white-space:pre-wrap;font-size:0.9rem;line-height:1.7;padding:16px;border-radius:8px;background:var(--gray-subtle);border:1px solid var(--border-color);">
            ${
              synthesis
                ? escapeHtml(synthesis)
                : "Nhấn nút 'Tạo báo cáo phân tích AI' để hệ thống tổng hợp bức tranh toàn cảnh về chuyên mục này, phân tách rõ tin đã xác minh từ báo chí với tin đồn/thảo luận mạng xã hội và dự báo diễn biến tiếp theo."
            }
          </div>
        </div>
      `;
    } else if (state.activeTopicTab === "chat-ai") {
      const chatList = state.topicChats[topic.id] || [];
      tabBodyHtml = `
        <div class="panel-card world-analyst-box">
          <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div>
              <strong>🤖 Trợ lý AI Chuyên biệt: ${escapeHtml(topic.name)}</strong>
              <div class="muted-small">Đã nạp ngữ cảnh ${filteredArticles.length} bài báo, ${filteredSocial.length} bài đăng MXH và ${allTerms.length} từ khóa/nhân vật.</div>
            </div>
            <button class="btn btn-outline-sm" data-clear-topic-chat="${escapeHtml(topic.id)}">Xóa hội thoại</button>
          </div>

          <div class="filter-bar" style="margin-bottom:10px;">
            <button class="quick-prompt-chip" data-topic-quick-q="Tóm tắt những diễn biến quan trọng nhất gần đây về ${escapeHtml(topic.name)}?">📌 Diễn biến mới nhất</button>
            <button class="quick-prompt-chip" data-topic-quick-q="Thông tin nào về ${escapeHtml(topic.name)} đã được báo chí xác minh và đâu là tin đồn trên mạng xã hội?">⚖️ Phân biệt tin thật &amp; tin đồn</button>
            <button class="quick-prompt-chip" data-topic-quick-q="Phân tích vai trò của các nhân vật/tổ chức đang theo dõi (${escapeHtml((topic.entities || []).join(", ") || topic.name)})?">👤 Phân tích nhân vật &amp; tổ chức</button>
          </div>

          <div class="analyst-messages" id="topic-chat-messages">
            ${
              chatList.length === 0
                ? `<div class="chat-bubble ai">Xin chào! Tôi là <strong>Trợ lý AI chuyên trách chuyên mục "${escapeHtml(topic.name)}"</strong>.\n\nTôi đang theo dõi các từ khóa: <em>${escapeHtml(allTerms.join(", ") || topic.name)}</em> cùng ${filteredArticles.length} bản tin báo chí và ${filteredSocial.length} thảo luận cộng đồng mới nhất.\n\nBạn có thể hỏi liên tục nhiều câu về các sự kiện, nhân vật hoặc yêu cầu kiểm chứng tin đồn mà không cần nhắc lại bối cảnh.</div>`
                : chatList
                    .map(
                      (m) =>
                        `<div class="chat-bubble ${m.role === "user" ? "user" : "ai"}">${escapeHtml(m.text)}</div>`
                    )
                    .join("")
            }
          </div>

          <form class="article-chat-form" id="topic-chat-form" data-topic-id="${escapeHtml(topic.id)}" style="padding:0;border:none;background:transparent;">
            <input
              type="text"
              id="topic-chat-input"
              placeholder="Đặt câu hỏi chuyên sâu về ${escapeHtml(topic.name)}..."
              required
            />
            <button type="submit" class="btn btn-ai-sm" id="topic-chat-submit">Gửi</button>
          </form>
        </div>
      `;
    }

    return `
      <!-- Banner đầu trang chuyên mục -->
      <div class="topic-banner-card">
        <div class="topic-banner-top">
          <div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <span class="tag-pill" style="background:rgba(255,255,255,0.18);color:#fff;">CHUYÊN MỤC CÁ NHÂN</span>
              <span class="tag-pill" style="background:rgba(23,92,211,0.55);color:#fff;">📍 ${escapeHtml(topic.region)}</span>
              ${topic.pinned ? `<span class="tag-pill" style="background:#F79009;color:#101828;">📌 Đã ghim</span>` : ""}
            </div>
            <h1 class="topic-banner-title">${escapeHtml(topic.name)}</h1>
            <p class="topic-banner-desc">${escapeHtml(topic.description || "Theo dõi tin tức thời gian thực, thảo luận mạng xã hội và phân tích AI theo bộ từ khóa cá nhân.")}</p>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline-sm" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.25);" data-refresh-topic="${escapeHtml(topic.id)}">
              ↻ Làm mới dữ liệu
            </button>
            <button class="btn btn-outline-sm" style="background:rgba(255,255,255,0.12);color:#fff;border-color:rgba(255,255,255,0.25);" data-edit-topic="${escapeHtml(topic.id)}">
              ✏️ Sửa từ khóa
            </button>
          </div>
        </div>

        <!-- Thanh lọc nhanh theo từng từ khóa / nhân vật -->
        <div class="topic-tags-wrap">
          <button class="topic-kw-pill ${kwFilter === "Tất cả" ? "active" : ""}" data-topic-kw-filter="Tất cả">Tất cả (${allTerms.length})</button>
          ${allTerms
            .map(
              (term) =>
                `<button class="topic-kw-pill ${kwFilter === term ? "active" : ""}" data-topic-kw-filter="${escapeHtml(term)}"># ${escapeHtml(term)}</button>`
            )
            .join("")}
        </div>
      </div>

      <!-- 6 Tab điều hướng của chuyên mục -->
      <div class="topic-tabs-bar">
        ${tabs
          .map(
            (tb) => `
            <button class="topic-tab-btn ${state.activeTopicTab === tb.id ? "active" : ""}" data-topic-tab="${tb.id}">
              <span>${tb.label}</span>
              ${tb.count !== null ? `<span style="opacity:0.85;">(${tb.count})</span>` : ""}
            </button>`
          )
          .join("")}
      </div>

      ${tabBodyHtml}
    `;
  }

  function renderTopicSocialCard(post) {
    return `
      <article class="social-card">
        <div class="social-card-header">
          <span class="platform-badge">${post.isVideo ? "🎬 Video • " : ""}${escapeHtml(post.platform)} • ${escapeHtml(post.community)}</span>
          <span class="tag-pill tag-blue">${escapeHtml(post.trendLabel)}</span>
        </div>
        <div class="social-author">
          Đăng bởi <strong>${escapeHtml(post.author)}</strong> • ${formatRelativeTime(post.createdAt)}
        </div>
        <h3 class="social-title">${escapeHtml(post.title)}</h3>
        ${post.image ? `<img src="${escapeHtml(post.image)}" alt="Ảnh minh họa" class="social-thumb" loading="lazy" onerror="this.style.display='none'" />` : ""}
        <p class="muted-small">${escapeHtml(post.summary)}</p>
        <div class="social-metrics">
          <span>▲ ${(post.upvotes || 0).toLocaleString("vi-VN")} ủng hộ</span>
          <span>💬 ${(post.commentsCount || 0).toLocaleString("vi-VN")} bình luận</span>
          <span>🔗 ${escapeHtml(post.externalDomain)}</span>
        </div>
        <div class="social-verification-note">
          ⚠️ Nội dung cộng đồng mạng – đối chiếu báo chí chính thống trước khi xác nhận.
        </div>
        <div class="card-footer-actions">
          <a href="${escapeHtml(post.permalink)}" target="_blank" rel="noopener noreferrer" class="mini-action-btn">Xem bài gốc ↗</a>
          ${post.externalUrl && post.externalUrl !== post.permalink ? `<a href="${escapeHtml(post.externalUrl)}" target="_blank" rel="noopener noreferrer" class="mini-action-btn ai-ask">Mở liên kết đính kèm ↗</a>` : ""}
        </div>
      </article>
    `;
  }

  /* ==========================================================================
     7. TRANG QUẢN LÝ CHUYÊN MỤC CÁ NHÂN (SẮP XẾP, GHIM, BẬT/TẮT NGUỒN, XÓA)
     ========================================================================== */
  function renderManageTopicsView() {
    const sorted = getSortedTopics();
    return `
      <div class="section-header">
        <h2 class="section-title">🗂️ Quản lý Chuyên mục Cá nhân hóa</h2>
        <button class="btn btn-ai-sm" id="manage-create-topic-btn">+ Tạo chuyên mục mới</button>
      </div>

      <div class="panel-card" style="padding:14px 16px;">
        <p class="muted-small">
          Toàn bộ danh sách chuyên mục, bộ từ khóa, cấu hình nguồn dữ liệu và lịch sử hội thoại AI được lưu tự động trong <code>localStorage</code> của trình duyệt này.
        </p>
      </div>

      ${
        sorted.length === 0
          ? `<div class="panel-card" style="text-align:center;padding:34px 20px;">
              <h3 style="margin-bottom:8px;">Bạn chưa tạo chuyên mục theo dõi riêng nào</h3>
              <p class="muted-small" style="margin-bottom:16px;">Hãy thử tạo chuyên mục đầu tiên (ví dụ: <strong>Đô vật Mỹ</strong>, <strong>Trí tuệ nhân tạo</strong> hoặc <strong>Chứng khoán Việt Nam</strong>) và dùng AI để gợi ý từ khóa tự động.</p>
              <button class="btn btn-ai-sm" id="empty-create-topic-btn">+ Tạo chuyên mục đầu tiên</button>
            </div>`
          : sorted
              .map(
                (t, index) => `
                <div class="manage-topic-card">
                  <div style="flex:1;min-width:260px;">
                    <div class="card-meta-top">
                      ${t.pinned ? `<span class="tag-pill tag-amber">📌 Đã ghim</span>` : ""}
                      <span class="tag-pill tag-navy">📍 ${escapeHtml(t.region)}</span>
                      <span class="tag-pill tag-blue">${t.keywords.length} từ khóa</span>
                      <span class="tag-pill tag-gray">${t.entities.length} nhân vật/tổ chức</span>
                      <span class="tag-pill ${t.notifyLatest !== false ? "tag-green" : "tag-gray"}">
                        ${t.notifyLatest !== false ? "🔔 Đang bật thông báo tin mới" : "🔕 Tắt thông báo"}
                      </span>
                    </div>
                    <h3 style="font-size:1.08rem;font-weight:800;margin-bottom:4px;cursor:pointer;" data-open-my-topic="${escapeHtml(t.id)}">
                      ${escapeHtml(t.name)}
                    </h3>
                    <p class="muted-small" style="margin-bottom:8px;">${escapeHtml(t.description || "Không có mô tả")}</p>
                    <div style="font-size:0.76rem;color:var(--text-secondary);">
                      <strong>Từ khóa:</strong> ${escapeHtml(t.keywords.join(", ") || "Chưa có")}
                    </div>
                  </div>

                  <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <button class="btn btn-ai-sm" data-open-my-topic="${escapeHtml(t.id)}">Mở trang tin</button>
                    <button class="btn btn-outline-sm" data-toggle-pin-topic="${escapeHtml(t.id)}">${t.pinned ? "Bỏ ghim" : "📌 Ghim"}</button>
                    <button class="btn btn-outline-sm" data-move-topic-up="${escapeHtml(t.id)}" ${index === 0 ? "disabled" : ""} title="Di chuyển lên">↑</button>
                    <button class="btn btn-outline-sm" data-move-topic-down="${escapeHtml(t.id)}" ${index === sorted.length - 1 ? "disabled" : ""} title="Di chuyển xuống">↓</button>
                    <button class="btn btn-outline-sm" data-edit-topic="${escapeHtml(t.id)}">✏️ Sửa</button>
                    <button class="btn btn-danger-sm" data-delete-topic="${escapeHtml(t.id)}">🗑️ Xóa</button>
                  </div>
                </div>`
              )
              .join("")
      }
    `;
  }

  async function handleRunTopicSynthesis(topicId) {
    const topic = state.myTopics.find((t) => t.id === topicId);
    if (!topic) return;
    const bundle = state.topicFeedCache[topic.id] || { articles: [], social: [] };

    state.topicSynthesis[topic.id] = "⏳ AI đang tổng hợp dữ liệu báo chí & mạng xã hội cho chuyên mục này...";
    renderCurrentView();

    const pressDigest = bundle.articles
      .slice(0, 12)
      .map((a, i) => `${i + 1}. [${a.source}] ${a.title}: ${a.description.slice(0, 130)}`)
      .join("\n");

    const socialDigest = bundle.social
      .slice(0, 8)
      .map((s, i) => `${i + 1}. [Reddit ${s.community} - ${s.upvotes} ủng hộ] ${s.title}`)
      .join("\n");

    const systemPrompt = `Bạn là Biên tập viên Chuyên trách của GLOBAL NEWS AI.
Hãy viết báo cáo phân tích chuyên sâu bằng TIẾNG VIỆT cho chuyên mục "${topic.name}".
Bắt buộc chia thành 4 phần rõ ràng:
1. [Tổng quan sự kiện đã xác minh từ báo chí]: Dựa trên các bản tin báo chí thu thập được.
2. [Xu hướng & Thảo luận trên mạng xã hội]: Những gì cộng đồng đang bàn luận và mức độ tin cậy (lưu ý phân biệt tin đồn với sự thật).
3. [Nhân vật & Tổ chức tâm điểm]: Phân tích vai trò của các đối tượng liên quan.
4. [Dự báo diễn biến tiếp theo]: Các kịch bản có thể xảy ra kèm mức độ bất định.`;

    const userPrompt = `Chuyên mục: ${topic.name}
Từ khóa theo dõi: ${topic.keywords.join(", ")}
Nhân vật/Tổ chức: ${topic.entities.join(", ")}

Dữ liệu báo chí thu thập được:
${pressDigest || "Chưa có bài báo trực tiếp"}

Dữ liệu mạng xã hội thu thập được:
${socialDigest || "Chưa có thảo luận trực tiếp"}`;

    try {
      const reply = await callAiAssistant({ systemPrompt, userPrompt });
      state.topicSynthesis[topic.id] = reply;
    } catch (err) {
      state.topicSynthesis[topic.id] =
        err.message === "CHUA_CAU_HINH_API"
          ? "⚠️ Chưa cấu hình khóa AI. Vui lòng vào mục 'Cấu hình kết nối API' để nhập khóa Gemini hoặc OpenAI."
          : `❌ Lỗi tạo báo cáo: ${err.message}`;
    }
    persistTopicSynthesis();
    renderCurrentView();
  }

  async function handleTopicChatSubmit(topicId, questionText) {
    const topic = state.myTopics.find((t) => t.id === topicId);
    if (!topic || !questionText.trim()) return;

    if (!state.topicChats[topicId]) state.topicChats[topicId] = [];
    state.topicChats[topicId].push({ role: "user", text: questionText });
    persistTopicChats();
    renderCurrentView();

    const box = document.getElementById("topic-chat-messages");
    if (box) {
      const wait = document.createElement("div");
      wait.className = "chat-bubble ai";
      wait.textContent = "⏳ AI đang đối chiếu ngữ cảnh chuyên mục và trả lời...";
      box.appendChild(wait);
      box.scrollTop = box.scrollHeight;
    }

    const bundle = state.topicFeedCache[topicId] || { articles: [], social: [] };
    const articlesContext = bundle.articles
      .slice(0, 10)
      .map((a) => `- [${a.source}] ${a.title}: ${a.description.slice(0, 120)}`)
      .join("\n");
    const socialContext = bundle.social
      .slice(0, 6)
      .map((s) => `- [Reddit ${s.community}] ${s.title}`)
      .join("\n");

    const systemPrompt = `Bạn là Trợ lý AI Chuyên biệt theo ngữ cảnh chuyên mục "${topic.name}" trên hệ thống GLOBAL NEWS AI.
THÔNG TIN NGỮ CẢNH CHUYÊN MỤC:
- Tên chuyên mục: ${topic.name}
- Mô tả: ${topic.description || "Không có"}
- Từ khóa đang theo dõi: ${topic.keywords.join(", ")}
- Nhân vật/Tổ chức theo dõi: ${topic.entities.join(", ")}
- Phạm vi địa lý: ${topic.region}

DỮ LIỆU ĐÃ THU THẬP TRONG CHUYÊN MỤC:
[Báo chí]:
${articlesContext || "Chưa có dữ liệu báo chí mới"}

[Mạng xã hội]:
${socialContext || "Chưa có dữ liệu mạng xã hội mới"}

QUY TẮC TRẢ LỜI BẮT BUỘC (TIẾNG VIỆT):
1. Người dùng có thể hỏi các câu liên tiếp mà không cần nhắc lại chủ đề; luôn bám sát chuyên mục "${topic.name}".
2. Phân biệt rõ ràng giữa: [Tin đã xác minh từ báo chí], [Thảo luận / Tin đồn mạng xã hội] và [Nhận định phân tích của AI].
3. Không tự bịa đặt số liệu hay sự kiện không có thật.`;

    try {
      const reply = await callAiAssistant({
        systemPrompt,
        userPrompt: questionText,
        history: state.topicChats[topicId].slice(0, -1)
      });
      state.topicChats[topicId].push({ role: "model", text: reply });
    } catch (err) {
      state.topicChats[topicId].push({
        role: "model",
        text:
          err.message === "CHUA_CAU_HINH_API"
            ? "⚠️ Chưa kết nối khóa AI. Vui lòng mở mục 'Cấu hình kết nối API' để nhập khóa Gemini API hoặc OpenAI API."
            : `❌ Lỗi phản hồi AI: ${err.message}`
      });
    }

    persistTopicChats();
    renderCurrentView();
    const updated = document.getElementById("topic-chat-messages");
    if (updated) updated.scrollTop = updated.scrollHeight;
  }

  /* ==========================================================================
     8. CẬP NHẬT TRẠNG THÁI GIAO DIỆN CHUNG & CÁC VIEW CƠ BẢN
     ========================================================================== */
  function updateConnectionIndicators() {
    const connected = hasAiKey();
    const dot = document.getElementById("ai-status-dot");
    const statusText = document.getElementById("ai-status-text");
    const banner = document.getElementById("api-warning-banner");
    const rightBadge = document.getElementById("right-ai-state");
    const healthAi = document.getElementById("ai-health-label");

    if (connected) {
      const s = getSettings();
      const provider = s.geminiKey
        ? "Gemini Cá nhân"
        : s.openaiKey
        ? "OpenAI Cá nhân"
        : vercelEnvStatus.provider || "Vercel Cloud";
      dot.className = "status-dot online";
      statusText.textContent = `AI: Đã kết nối (${provider})`;
      banner.classList.add("hidden");
      rightBadge.className = "tag-pill tag-green";
      rightBadge.textContent = `Sẵn sàng (${provider})`;
      healthAi.textContent = `Hoạt động (${provider})`;
      healthAi.style.color = "var(--green-ok)";
    } else {
      dot.className = "status-dot offline";
      statusText.textContent = "AI: Chưa cấu hình";
      banner.classList.remove("hidden");
      rightBadge.className = "tag-pill tag-amber";
      rightBadge.textContent = "Chưa kết nối";
      healthAi.textContent = "Chưa có khóa API";
      healthAi.style.color = "var(--amber-warn)";
    }
  }

  function updateHeaderAndSidebarStats() {
    const breakingList = state.articles.filter((a) => a.isBreaking);
    document.getElementById("count-tin-nong").textContent = breakingList.length;
    document.getElementById("count-social").textContent = state.socialPosts.length;
    document.getElementById("count-saved").textContent = state.savedIds.length;

    document.getElementById("rss-health-count").textContent = `${state.rssSuccessCount}/${window.GLOBAL_NEWS_CONFIG.RSS_FEEDS.length} nguồn (${state.articles.length} tin)`;
    document.getElementById("social-health-count").textContent = `${state.socialPosts.length} thảo luận`;

    if (state.lastUpdated) {
      document.getElementById("last-updated-label").textContent =
        "Cập nhật: " + state.lastUpdated.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }

    const tickerEl = document.getElementById("breaking-ticker-content");
    const tickerItems = (breakingList.length > 0 ? breakingList : state.articles).slice(0, 10);
    if (tickerItems.length > 0) {
      const htmlItems = tickerItems
        .map(
          (item) =>
            `<span class="ticker-item" data-open-article="${escapeHtml(item.id)}">
              <span class="ticker-source">${escapeHtml(item.source)}</span>
              <span>${escapeHtml(item.title)}</span>
            </span>`
        )
        .join("");
      tickerEl.innerHTML = htmlItems + htmlItems;
    } else {
      tickerEl.innerHTML = "<span>Chưa tải được luồng RSS trực tiếp. Kiểm tra kết nối mạng hoặc nhấn Cập nhật.</span>";
    }

    const trendingContainer = document.getElementById("right-trending-topics");
    const topClusters = state.clusters.slice(0, 5);
    if (topClusters.length > 0) {
      trendingContainer.innerHTML = topClusters
        .map(
          (cl) => `
          <div class="cluster-item" data-open-article="${escapeHtml(cl.articles[0].id)}">
            <div class="cluster-title">${escapeHtml(cl.topicTitle)}</div>
            <div class="cluster-meta">
              <span>${cl.articles.length > 1 ? `🔗 ${cl.articles.length} bài từ ${cl.sources.length} nguồn` : `📰 ${escapeHtml(cl.sources[0])}`}</span>
              <span>${escapeHtml(CATEGORY_LABELS[cl.category] || "Thế giới")}</span>
            </div>
          </div>`
        )
        .join("");
    } else {
      trendingContainer.innerHTML = `<p class="muted-small">Đang tổng hợp các cụm sự kiện từ báo chí quốc tế...</p>`;
    }

    const rightSocial = document.getElementById("right-social-highlights");
    if (state.socialPosts.length > 0) {
      rightSocial.innerHTML = state.socialPosts
        .slice(0, 4)
        .map(
          (p) => `
          <div class="cluster-item">
            <a href="${escapeHtml(p.permalink)}" target="_blank" rel="noopener noreferrer" class="cluster-title" style="display:block;">
              ${escapeHtml(p.title)}
            </a>
            <div class="cluster-meta">
              <span>Reddit • ${escapeHtml(p.community)}</span>
              <span>▲ ${(p.upvotes || 0).toLocaleString("vi-VN")}</span>
            </div>
          </div>`
        )
        .join("");
    } else {
      rightSocial.innerHTML = `<p class="muted-small">Chưa có dữ liệu thảo luận mạng xã hội.</p>`;
    }

    const platformListEl = document.getElementById("platform-status-list");
    const restricted = window.GLOBAL_NEWS_CONFIG.RESTRICTED_SOCIAL_PLATFORMS || [];
    platformListEl.innerHTML =
      `<div class="platform-status-row">
        <strong><span>Reddit (API Công khai)</span><span style="color:var(--green-ok)">● Trực tiếp</span></strong>
        <span class="muted-small">Đang đồng bộ thảo luận thời gian thực.</span>
      </div>` +
      restricted
        .map(
          (item) => `
          <div class="platform-status-row">
            <strong><span>${escapeHtml(item.platform)}</span><span style="color:var(--amber-warn)">● Cần Proxy</span></strong>
            <span class="muted-small">${escapeHtml(item.reason)}</span>
          </div>`
        )
        .join("");
  }

  function showToast(message) {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = "toast-msg";
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function getFilteredArticles(categoryFilter = null) {
    return state.articles.filter((art) => {
      if (categoryFilter === "tin-nong" && !art.isBreaking) return false;
      if (
        categoryFilter &&
        categoryFilter !== "trang-chu" &&
        categoryFilter !== "tin-nong" &&
        art.category !== categoryFilter
      ) {
        return false;
      }
      if (state.regionFilter !== "Tất cả" && art.region !== state.regionFilter) {
        return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        const hay = `${art.title} ${art.description} ${art.source} ${art.region}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function renderArticleCard(art) {
    const isSaved = state.savedIds.includes(art.id);
    const catLabel = CATEGORY_LABELS[art.category] || "Thế giới";
    return `
      <article class="news-card">
        <div class="news-card-media" data-open-article="${escapeHtml(art.id)}">
          <img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" loading="lazy" onerror="this.src='${buildFallbackImage(art.source, art.category)}'" />
        </div>
        <div class="news-card-body">
          <div class="card-meta-top">
            ${art.isBreaking ? `<span class="tag-pill tag-red">TIN NÓNG</span>` : ""}
            <span class="tag-pill tag-navy">${escapeHtml(art.source)}</span>
            <span class="tag-pill tag-gray">${escapeHtml(catLabel)}</span>
            <span class="tag-pill tag-gray">${escapeHtml(art.region)}</span>
          </div>
          <h3 class="news-card-title" data-open-article="${escapeHtml(art.id)}">${escapeHtml(art.title)}</h3>
          <p class="news-card-desc">${escapeHtml(art.description)}</p>
          <div class="card-footer-actions">
            <span>${formatRelativeTime(art.pubDate)}</span>
            <div class="card-btn-group">
              <button class="mini-action-btn" data-toggle-save="${escapeHtml(art.id)}">
                ${isSaved ? "✓ Đã lưu" : "🔖 Lưu"}
              </button>
              <button class="mini-action-btn ai-ask" data-open-article-ai="${escapeHtml(art.id)}">
                ✦ Hỏi AI
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderRegionFilterBar() {
    const regions = ["Tất cả", "Toàn cầu", "Việt Nam", "Mỹ", "Trung Quốc", "Châu Âu", "Châu Á"];
    return `
      <div class="filter-bar">
        ${regions
          .map(
            (r) =>
              `<button class="filter-chip ${state.regionFilter === r ? "active" : ""}" data-region-filter="${r}">${r}</button>`
          )
          .join("")}
      </div>
    `;
  }

  function renderHomeView() {
    if (state.isLoadingNews && state.articles.length === 0) {
      return `
        <div class="panel-card">
          <h3>Đang kết nối các hãng thông tấn quốc tế...</h3>
          <p class="muted-small" style="margin-bottom:14px;">Hệ thống đang tải dữ liệu RSS thời gian thực từ BBC, Al Jazeera, The Guardian, The New York Times, ESPN và VnExpress.</p>
          <div class="skeleton-line" style="height:220px;margin-bottom:12px;"></div>
          <div class="skeleton-line" style="width:70%;margin-bottom:8px;"></div>
          <div class="skeleton-line" style="width:50%;"></div>
        </div>
      `;
    }

    const filtered = getFilteredArticles("trang-chu");
    if (filtered.length === 0) {
      return `
        ${renderRegionFilterBar()}
        <div class="panel-card">
          <h3>Không tìm thấy bài báo phù hợp</h3>
          <p class="muted-small">Thử thay đổi bộ lọc khu vực, xóa từ khóa tìm kiếm hoặc nhấn nút "Cập nhật" trên thanh công cụ.</p>
        </div>
      `;
    }

    const hero = filtered[0];
    const sideStories = filtered.slice(1, 4);
    const latestGrid = filtered.slice(4, 24);

    return `
      ${renderRegionFilterBar()}

      <div class="section-header">
        <h2 class="section-title">📰 Tiêu điểm Quốc tế</h2>
        <span class="section-subtitle">Tổng hợp trực tiếp từ các hãng thông tấn uy tín</span>
      </div>

      <section class="hero-grid">
        <article class="hero-main-card" data-open-article="${escapeHtml(hero.id)}">
          <div class="hero-image-wrap">
            <img src="${escapeHtml(hero.image)}" alt="${escapeHtml(hero.title)}" onerror="this.src='${buildFallbackImage(hero.source, hero.category)}'" />
            <div class="hero-overlay-badges">
              ${hero.isBreaking ? `<span class="tag-pill tag-red">TIN NÓNG</span>` : ""}
              <span class="tag-pill tag-navy">${escapeHtml(hero.source)}</span>
              <span class="tag-pill tag-blue">${escapeHtml(CATEGORY_LABELS[hero.category] || "Thế giới")}</span>
            </div>
          </div>
          <div class="hero-body">
            <h1 class="hero-title">${escapeHtml(hero.title)}</h1>
            <p class="hero-desc">${escapeHtml(hero.description)}</p>
            <div class="card-footer-actions">
              <span>${formatRelativeTime(hero.pubDate)} • Khu vực: ${escapeHtml(hero.region)}</span>
              <div class="card-btn-group">
                <button class="mini-action-btn ai-ask" data-open-article-ai="${escapeHtml(hero.id)}">✦ Phân tích bằng AI</button>
              </div>
            </div>
          </div>
        </article>

        <div class="hero-side-list">
          ${sideStories
            .map(
              (s) => `
              <article class="side-story-card" data-open-article="${escapeHtml(s.id)}">
                <div class="card-meta-top">
                  ${s.isBreaking ? `<span class="tag-pill tag-red">TIN NÓNG</span>` : ""}
                  <span class="tag-pill tag-navy">${escapeHtml(s.source)}</span>
                  <span class="muted-small">${formatRelativeTime(s.pubDate)}</span>
                </div>
                <h3 class="side-story-title">${escapeHtml(s.title)}</h3>
                <p class="muted-small">${escapeHtml(s.description.slice(0, 115))}...</p>
              </article>`
            )
            .join("")}
        </div>
      </section>

      <div class="section-header">
        <h2 class="section-title">🕒 Tin mới nhất theo dòng thời gian</h2>
        <span class="section-subtitle">Hiển thị ${latestGrid.length} bài viết mới cập nhật</span>
      </div>

      <section class="news-grid">
        ${latestGrid.map(renderArticleCard).join("")}
      </section>
    `;
  }

  function renderCategoryView(catKey) {
    const title = CATEGORY_LABELS[catKey] || "Tin tức";
    const list = getFilteredArticles(catKey);
    return `
      ${renderRegionFilterBar()}
      <div class="section-header">
        <h2 class="section-title">${escapeHtml(title)}</h2>
        <span class="section-subtitle">${list.length} bài báo được phân loại tự động</span>
      </div>
      ${
        list.length === 0
          ? `<div class="panel-card"><p class="muted-small">Chưa có bài viết nào trong chuyên mục này khớp với bộ lọc hiện tại.</p></div>`
          : `<section class="news-grid">${list.map(renderArticleCard).join("")}</section>`
      }
    `;
  }

  function renderSocialView() {
    const regions = ["Toàn cầu", "Việt Nam", "Mỹ", "Trung Quốc", "Châu Âu", "Châu Á"];
    const topics = [
      { id: "Tất cả", label: "Tất cả chủ đề" },
      { id: "chinh-tri", label: "Chính trị" },
      { id: "kinh-te", label: "Kinh tế" },
      { id: "the-thao", label: "Thể thao" },
      { id: "cong-nghe", label: "Công nghệ" },
      { id: "xa-hoi", label: "Xã hội & Giải trí" }
    ];

    const filtered = state.socialPosts.filter((p) => {
      if (state.socialRegionFilter !== "Toàn cầu" && p.region !== state.socialRegionFilter) return false;
      if (state.socialTopicFilter !== "Tất cả" && p.category !== state.socialTopicFilter) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        if (!`${p.title} ${p.summary} ${p.community}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    return `
      <div class="section-header">
        <h2 class="section-title">📱 Tin nóng Mạng xã hội Toàn cầu</h2>
        <span class="section-subtitle">Tổng hợp thảo luận &amp; xu hướng từ nguồn công khai được cấp phép</span>
      </div>

      <div class="panel-card" style="padding:14px 16px;">
        <div style="font-size:0.82rem;color:var(--text-secondary);margin-bottom:8px;">
          <strong>Nguyên tắc kiểm chứng tòa soạn:</strong> Lượt tương tác cao trên mạng xã hội <u>không đồng nghĩa</u> với độ tin cậy của thông tin. Dữ liệu dưới đây thu thập trực tiếp từ các cộng đồng công khai trên <strong>Reddit</strong>. Các nền tảng yêu cầu OAuth/Proxy (<strong>X, TikTok, Facebook, Instagram, Threads, YouTube</strong>) sẽ tự động kích hoạt khi bạn kết nối máy chủ trung gian trong phần Cấu hình API.
        </div>
        <div class="filter-bar" style="margin-bottom:8px;">
          ${regions
            .map(
              (r) =>
                `<button class="filter-chip ${state.socialRegionFilter === r ? "active" : ""}" data-social-region="${r}">${r}</button>`
            )
            .join("")}
        </div>
        <div class="filter-bar" style="margin-bottom:0;">
          ${topics
            .map(
              (t) =>
                `<button class="filter-chip ${state.socialTopicFilter === t.id ? "active" : ""}" data-social-topic="${t.id}">${t.label}</button>`
            )
            .join("")}
        </div>
      </div>

      ${
        filtered.length === 0
          ? `<div class="panel-card"><p class="muted-small">Không có thảo luận mạng xã hội nào khớp với bộ lọc hiện tại.</p></div>`
          : `<div class="social-grid">
              ${filtered
                .map((post) => {
                  const aiResult = state.socialAiAnalyses[post.id];
                  return `
                  <article class="social-card">
                    <div class="social-card-header">
                      <span class="platform-badge">Reddit • ${escapeHtml(post.community)}</span>
                      <span class="tag-pill tag-blue">${escapeHtml(post.trendLabel)}</span>
                    </div>
                    <div class="social-author">
                      Đăng bởi <strong>${escapeHtml(post.author)}</strong> • ${formatRelativeTime(post.createdAt)} • Khu vực: ${escapeHtml(post.region)}
                    </div>
                    <h3 class="social-title">${escapeHtml(post.title)}</h3>
                    ${post.image ? `<img src="${escapeHtml(post.image)}" alt="Ảnh minh họa bài đăng" class="social-thumb" loading="lazy" onerror="this.style.display='none'" />` : ""}
                    <p class="muted-small">${escapeHtml(post.summary)}</p>

                    <div class="social-metrics">
                      ${post.upvotes !== null ? `<span>▲ ${post.upvotes.toLocaleString("vi-VN")} lượt ủng hộ</span>` : ""}
                      ${post.commentsCount !== null ? `<span>💬 ${post.commentsCount.toLocaleString("vi-VN")} bình luận</span>` : ""}
                      <span>🔗 Nguồn dẫn: ${escapeHtml(post.externalDomain)}</span>
                    </div>

                    <div class="social-verification-note">
                      ⚠️ <strong>Trạng thái kiểm chứng:</strong> Nội dung lan truyền từ cộng đồng mạng – cần đối chiếu với báo chí chính thống trước khi trích dẫn.
                    </div>

                    ${aiResult ? `<div class="social-ai-box">${escapeHtml(aiResult)}</div>` : ""}

                    <div class="card-footer-actions">
                      <a href="${escapeHtml(post.permalink)}" target="_blank" rel="noopener noreferrer" class="mini-action-btn">Mở bài đăng gốc ↗</a>
                      <button class="mini-action-btn ai-ask" data-analyze-social="${escapeHtml(post.id)}">
                        ${aiResult ? "↻ Phân tích lại bằng AI" : "✦ AI Phân tích Xu hướng & Kiểm chứng"}
                      </button>
                    </div>
                  </article>`;
                })
                .join("")}
            </div>`
      }
    `;
  }

  function renderDeepAnalysisView() {
    const multiSourceClusters = state.clusters.filter((c) => c.articles.length >= 1).slice(0, 12);
    return `
      <div class="section-header">
        <h2 class="section-title">🧭 Phân tích Chuyên sâu &amp; Theo dõi Sự kiện Đa nguồn</h2>
        <span class="section-subtitle">Tự động gom nhóm các bản tin cùng chủ đề từ nhiều hãng thông tấn</span>
      </div>

      ${multiSourceClusters
        .map(
          (cl) => `
          <div class="panel-card">
            <div class="card-meta-top">
              <span class="tag-pill tag-blue">${cl.articles.length} bài báo liên quan</span>
              <span class="tag-pill tag-navy">${escapeHtml(CATEGORY_LABELS[cl.category] || "Thế giới")}</span>
              <span class="tag-pill tag-gray">${escapeHtml(cl.region)}</span>
            </div>
            <h3 style="font-size:1.12rem;font-weight:800;margin-bottom:8px;">${escapeHtml(cl.topicTitle)}</h3>
            <p class="muted-small" style="margin-bottom:12px;">
              Các hãng tin đưa tin: <strong>${escapeHtml(cl.sources.join(", "))}</strong>
            </p>
            <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
              ${cl.articles
                .map(
                  (a) => `
                  <div style="padding:8px 12px;border-radius:6px;background:var(--gray-subtle);border:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;gap:10px;">
                    <div>
                      <strong style="font-size:0.84rem;cursor:pointer;" data-open-article="${escapeHtml(a.id)}">${escapeHtml(a.title)}</strong>
                      <div class="muted-small">${escapeHtml(a.source)} • ${formatRelativeTime(a.pubDate)}</div>
                    </div>
                    <button class="mini-action-btn ai-ask" data-open-article-ai="${escapeHtml(a.id)}">Hỏi AI</button>
                  </div>`
                )
                .join("")}
            </div>
          </div>`
        )
        .join("")}
    `;
  }

  function renderDailyBriefingView() {
    const topArticles = state.articles.slice(0, 12);
    return `
      <div class="section-header">
        <h2 class="section-title">🗞️ Bản tin Tổng hợp Trong ngày</h2>
        <span class="section-subtitle">Điểm tin trọng tâm trong 3–5 phút đọc</span>
      </div>

      <div class="panel-card">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <div>
            <h3 style="font-size:1.05rem;">Bản tin Điều hành do AI Biên soạn</h3>
            <p class="muted-small">Tổng hợp từ ${topArticles.length} sự kiện mới nhất đang hiển thị trên tòa soạn.</p>
          </div>
          <button class="btn btn-ai-sm" id="generate-daily-briefing-btn">✦ Tạo bản tin tổng hợp ngay</button>
        </div>

        <div id="daily-briefing-output" style="white-space:pre-wrap;font-size:0.92rem;line-height:1.7;padding:16px;border-radius:8px;background:var(--gray-subtle);border:1px solid var(--border-color);">
          ${
            state.dailyBriefingText
              ? escapeHtml(state.dailyBriefingText)
              : "Nhấn nút 'Tạo bản tin tổng hợp ngay' để AI tóm lược bức tranh toàn cảnh thế giới hôm nay theo từng mảng: Chính trị, Kinh tế, Công nghệ, Thể thao và Tác động đến Việt Nam."
          }
        </div>
      </div>
    `;
  }

  function renderWorldAnalystView() {
    return `
      <div class="section-header">
        <h2 class="section-title">🤖 Trợ lý AI Phân tích Thế giới</h2>
        <span class="section-subtitle">Chuyên gia phân tích địa chính trị, kinh tế &amp; xu hướng toàn cầu</span>
      </div>

      <div class="panel-card world-analyst-box">
        <div class="filter-bar" style="margin-bottom:10px;">
          <button class="quick-prompt-chip" data-world-prompt="Tình hình chính trị và địa chính trị thế giới hiện nay có những điểm nóng nào đáng chú ý nhất?">🌍 Điểm nóng chính trị thế giới</button>
          <button class="quick-prompt-chip" data-world-prompt="Phân tích triển vọng kinh tế toàn cầu, lãi suất, giá vàng và dầu mỏ dựa trên các tin tức mới nhất.">💹 Kinh tế &amp; Tài chính toàn cầu</button>
          <button class="quick-prompt-chip" data-world-prompt="Đánh giá tác động của các biến động quốc tế hiện tại đối với xuất nhập khẩu và kinh tế Việt Nam.">🇻🇳 Tác động tới Việt Nam</button>
          <button class="quick-prompt-chip" data-world-prompt="Những xu hướng công nghệ và trí tuệ nhân tạo nào đang định hình thị trường hiện nay?">🚀 Xu hướng AI &amp; Công nghệ</button>
        </div>

        <div class="analyst-messages" id="world-analyst-messages">
          ${
            state.worldChatHistory.length === 0
              ? `<div class="chat-bubble ai">Xin chào! Tôi là <strong>Trợ lý AI Phân tích Thế giới</strong> của GLOBAL NEWS AI.\n\nTôi có thể giúp bạn tổng hợp diễn biến thời sự quốc tế, so sánh quan hệ giữa các cường quốc, phân tích thị trường tài chính hoặc đánh giá tác động đối với Việt Nam. Tôi luôn ưu tiên đối chiếu dữ liệu từ các bản tin mới nhất đang được cập nhật trên hệ thống và phân tách rõ đâu là dữ kiện báo chí, đâu là nhận định phân tích.\n\nBạn muốn tìm hiểu vấn đề gì hôm nay?</div>`
              : state.worldChatHistory
                  .map(
                    (m) =>
                      `<div class="chat-bubble ${m.role === "user" ? "user" : "ai"}">${escapeHtml(m.text)}</div>`
                  )
                  .join("")
          }
        </div>

        <form class="article-chat-form" id="world-analyst-form" style="padding:0;border:none;background:transparent;">
          <input
            type="text"
            id="world-analyst-input"
            placeholder="Đặt câu hỏi về tình hình thế giới, kinh tế, xung đột hoặc xu hướng..."
            required
          />
          <button type="button" class="btn btn-outline-sm" id="clear-world-chat-btn">Xóa lịch sử</button>
          <button type="submit" class="btn btn-ai-sm" id="world-analyst-submit">Phân tích</button>
        </form>
      </div>
    `;
  }

  function renderSavedOrHistoryView(mode) {
    const ids = mode === "tin-da-luu" ? state.savedIds : state.readHistory;
    const items = ids
      .map((id) => state.articles.find((a) => a.id === id))
      .filter(Boolean);

    return `
      <div class="section-header">
        <h2 class="section-title">${mode === "tin-da-luu" ? "🔖 Bài báo đã lưu" : "🕒 Lịch sử đọc báo"}</h2>
        <span class="section-subtitle">${items.length} bài viết được lưu trên trình duyệt này</span>
      </div>
      ${
        items.length === 0
          ? `<div class="panel-card"><p class="muted-small">Danh sách hiện đang trống. Nhấn nút "Lưu" trên bất kỳ thẻ tin tức nào để lưu lại đọc sau.</p></div>`
          : `<section class="news-grid">${items.map(renderArticleCard).join("")}</section>`
      }
    `;
  }

  function renderApiSettingsView() {
    const s = getSettings();
    return `
      <div class="section-header">
        <h2 class="section-title">⚙️ Cấu hình Kết nối API &amp; Bảo mật</h2>
        <span class="section-subtitle">Quản lý khóa AI, máy chủ Proxy và nguồn dữ liệu thời gian thực</span>
      </div>

      <div class="panel-card">
        <h3 style="margin-bottom:8px;">1. Kết nối Trí tuệ Nhân tạo (Bắt buộc cho tính năng AI)</h3>
        <p class="muted-small" style="margin-bottom:16px;">
          Khóa API được lưu cục bộ trong <code>localStorage</code> trên trình duyệt của bạn, không gửi đi bất kỳ máy chủ bên thứ ba nào ngoài nhà cung cấp AI bạn chọn.
        </p>

        <form id="api-settings-form">
          <div class="form-group">
            <label for="cfg-gemini-key">Khóa Google Gemini API (Khuyên dùng – Có gói miễn phí)</label>
            <input type="password" id="cfg-gemini-key" value="${escapeHtml(s.geminiKey)}" placeholder="AIzaSy..." />
            <div class="form-help">Lấy khóa miễn phí tại Google AI Studio (aistudio.google.com).</div>
          </div>

          <div class="form-group">
            <label for="cfg-gemini-model">Mô hình Gemini</label>
            <select id="cfg-gemini-model">
              <option value="gemini-3.8-flash" ${s.geminiModel === "gemini-3.8-flash" ? "selected" : ""}>gemini-3.8-flash (Nhanh, tối ưu phân tích tin tức)</option>
              <option value="gemini-2.5-pro" ${s.geminiModel === "gemini-2.5-pro" ? "selected" : ""}>gemini-2.5-pro (Phân tích chuyên sâu phức tạp)</option>
            </select>
          </div>

          <div class="form-group">
            <label for="cfg-openai-key">Khóa OpenAI API (Tùy chọn dự phòng)</label>
            <input type="password" id="cfg-openai-key" value="${escapeHtml(s.openaiKey)}" placeholder="sk-..." />
          </div>

          <div class="form-group">
            <label for="cfg-proxy-url">URL Máy chủ Proxy Backend (Tùy chọn nâng cao)</label>
            <input type="url" id="cfg-proxy-url" value="${escapeHtml(s.proxyUrl)}" placeholder="https://your-backend-proxy.example.com/api/ai" />
            <div class="form-help">Dùng khi bạn triển khai backend riêng để bảo vệ khóa bí mật và vượt giới hạn CORS cho X/TikTok/Meta API.</div>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="submit" class="btn btn-ai-sm">Lưu cấu hình API</button>
            <button type="button" class="btn btn-outline-sm" id="test-ai-connection-btn">Kiểm tra kết nối AI</button>
            <button type="button" class="btn btn-outline-sm" id="reset-api-settings-btn">Xóa khóa đã lưu</button>
          </div>
        </form>
      </div>

      <div class="panel-card">
        <h3 style="margin-bottom:8px;">2. Trạng thái Nguồn Tin tức &amp; Mạng xã hội</h3>
        <ul style="padding-left:18px;font-size:0.86rem;color:var(--text-secondary);line-height:1.8;">
          <li><strong>Báo chí quốc tế (RSS):</strong> Đang kết nối ${window.GLOBAL_NEWS_CONFIG.RSS_FEEDS.length} kênh RSS chính thức (BBC, Al Jazeera, The Guardian, NYT, ESPN, VnExpress) thông qua bộ chuyển đổi hỗ trợ CORS.</li>
          <li><strong>Chuyên mục cá nhân hóa (My Topics):</strong> Truy vấn dữ liệu thời gian thực qua Google Tin tức RSS &amp; Reddit Search API theo từng bộ từ khóa do người dùng thiết lập.</li>
          <li><strong>Các mạng xã hội yêu cầu OAuth/Proxy (X, TikTok, Facebook, Instagram, Threads):</strong> Không giả lập số liệu; hiển thị trạng thái trung thực cho tới khi kết nối Backend Proxy hợp lệ.</li>
        </ul>
      </div>
    `;
  }

  function renderCurrentView() {
    const container = document.getElementById("view-container");
    switch (state.currentView) {
      case "trang-chu":
        container.innerHTML = renderHomeView();
        break;
      case "tin-nong":
      case "chinh-tri":
      case "kinh-te":
      case "the-thao":
      case "cong-nghe":
      case "the-gioi":
        container.innerHTML = renderCategoryView(state.currentView);
        break;
      case "chuyen-muc-ca-nhan":
        container.innerHTML = renderCustomTopicView(state.activeTopicId);
        break;
      case "quan-ly-chuyen-muc":
        container.innerHTML = renderManageTopicsView();
        break;
      case "mang-xa-hoi":
        container.innerHTML = renderSocialView();
        break;
      case "phan-tich-chuyen-sau":
        container.innerHTML = renderDeepAnalysisView();
        break;
      case "ban-tin-trong-ngay":
        container.innerHTML = renderDailyBriefingView();
        break;
      case "tro-ly-ai":
        container.innerHTML = renderWorldAnalystView();
        break;
      case "tin-da-luu":
      case "lich-su-doc":
        container.innerHTML = renderSavedOrHistoryView(state.currentView);
        break;
      case "cau-hinh-api":
        container.innerHTML = renderApiSettingsView();
        break;
      default:
        container.innerHTML = renderHomeView();
    }
  }

  /* ==========================================================================
     9. TRANG ĐỌC CHI TIẾT BÀI BÁO & KHUNG CHAT AI TRONG BÀI BÁO
     ========================================================================== */
  function openArticleReader(articleId, focusAi = false) {
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) return;

    state.activeArticle = article;
    state.readHistory = [article.id, ...state.readHistory.filter((id) => id !== article.id)];
    persistHistory();

    const isSaved = state.savedIds.includes(article.id);
    const saveBtn = document.getElementById("reader-save-btn");
    saveBtn.textContent = isSaved ? "✓ Đã lưu bài viết" : "🔖 Lưu bài viết";

    const origLink = document.getElementById("reader-original-link");
    origLink.href = article.link || "#";

    const related = state.articles
      .filter((a) => a.id !== article.id && a.category === article.category)
      .slice(0, 3);

    const contentPane = document.getElementById("reader-article-content");
    contentPane.innerHTML = `
      <div class="card-meta-top">
        ${article.isBreaking ? `<span class="tag-pill tag-red">TIN NÓNG</span>` : ""}
        <span class="tag-pill tag-navy">${escapeHtml(article.source)}</span>
        <span class="tag-pill tag-blue">${escapeHtml(CATEGORY_LABELS[article.category] || "Thế giới")}</span>
        <span class="tag-pill tag-gray">${escapeHtml(article.region)}</span>
      </div>
      <h1 class="reader-headline">${escapeHtml(article.title)}</h1>
      <div class="reader-byline">
        <span>Nguồn tin: <strong>${escapeHtml(article.source)}</strong></span>
        <span>Tác giả / Đơn vị: ${escapeHtml(article.author || article.source)}</span>
        <span>Thời gian xuất bản: ${new Date(article.pubDate).toLocaleString("vi-VN")}</span>
      </div>
      <img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.title)}" class="reader-hero-img" onerror="this.src='${buildFallbackImage(article.source, article.category)}'" />
      <div class="reader-text">
        <p>${escapeHtml(article.fullContent || article.description)}</p>
      </div>
      <div class="reader-disclaimer">
        <strong>Lưu ý bản quyền &amp; nguồn dữ liệu:</strong> Nội dung trích dẫn trên được đồng bộ trực tiếp từ luồng RSS chính thức của <strong>${escapeHtml(article.source)}</strong>. Nhấn <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--blue-ai);font-weight:700;">Đọc bài gốc tại ${escapeHtml(article.source)} ↗</a> để xem toàn văn trên trang chủ của hãng tin, hoặc sử dụng <strong>Trợ lý AI Đọc hiểu</strong> ở khung bên cạnh để dịch, tóm tắt và phân tích sâu sự kiện này.
      </div>

      ${
        related.length > 0
          ? `<div style="margin-top:26px;">
              <h3 style="font-size:1rem;margin-bottom:12px;">Bài viết liên quan cùng chuyên mục</h3>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${related
                  .map(
                    (r) => `
                    <div class="side-story-card" data-open-article="${escapeHtml(r.id)}">
                      <div class="muted-small">${escapeHtml(r.source)} • ${formatRelativeTime(r.pubDate)}</div>
                      <div style="font-weight:700;font-size:0.9rem;">${escapeHtml(r.title)}</div>
                    </div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
    `;

    const suggestions = [
      "Hãy tóm tắt bài báo này bằng tiếng Việt.",
      "Nguyên nhân sâu xa của sự kiện này là gì?",
      "Việt Nam chịu ảnh hưởng như thế nào?",
      "Những nhân vật và tổ chức nào liên quan trực tiếp?",
      "Điều gì có thể xảy ra tiếp theo?"
    ];
    document.getElementById("article-suggested-questions").innerHTML = suggestions
      .map((q) => `<button type="button" class="suggested-q-btn" data-quick-article-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
      .join("");

    renderArticleChatMessages(article.id);

    const modal = document.getElementById("article-reader-modal");
    modal.classList.remove("hidden");

    if (focusAi) {
      document.getElementById("reader-ai-pane").classList.add("open");
      document.getElementById("article-chat-input").focus();
    } else {
      document.getElementById("reader-ai-pane").classList.remove("open");
    }
  }

  function renderArticleChatMessages(articleId) {
    const box = document.getElementById("article-chat-messages");
    const history = state.articleChats[articleId] || [];
    if (history.length === 0) {
      box.innerHTML = `<div class="chat-bubble ai">Tôi đã đọc nội dung bài báo này từ <strong>${escapeHtml(state.activeArticle?.source || "hãng tin")}</strong>.\n\nBạn có thể nhấn các nút công cụ phía trên để tóm tắt, dịch sang tiếng Việt hoặc đặt bất kỳ câu hỏi nào. Tôi sẽ phân biệt rõ:\n• [Theo bài báo]: Thông tin xác nhận trong bài.\n• [Bối cảnh bổ sung]: Kiến thức nền liên quan.\n• [Nhận định AI]: Phân tích và dự báo của trợ lý.</div>`;
    } else {
      box.innerHTML = history
        .map((m) => `<div class="chat-bubble ${m.role === "user" ? "user" : "ai"}">${escapeHtml(m.text)}</div>`)
        .join("");
    }
    box.scrollTop = box.scrollHeight;
  }

  async function handleAskAboutArticle(questionText) {
    const article = state.activeArticle;
    if (!article || !questionText.trim()) return;

    const artId = article.id;
    if (!state.articleChats[artId]) state.articleChats[artId] = [];
    state.articleChats[artId].push({ role: "user", text: questionText });
    persistArticleChats();
    renderArticleChatMessages(artId);

    const submitBtn = document.getElementById("article-chat-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Đang phân tích...";

    const box = document.getElementById("article-chat-messages");
    const loadingBubble = document.createElement("div");
    loadingBubble.className = "chat-bubble ai";
    loadingBubble.textContent = "⏳ Trợ lý AI đang đối chiếu dữ kiện bài báo và phân tích...";
    box.appendChild(loadingBubble);
    box.scrollTop = box.scrollHeight;

    const systemPrompt = `Bạn là Biên tập viên Phân tích Quốc tế của ứng dụng GLOBAL NEWS AI.
Nhiệm vụ của bạn là trả lời câu hỏi của độc giả bằng TIẾNG VIỆT chuẩn xác, khách quan dựa trên bài báo đang mở.
QUY TẮC BẮT BUỘC:
1. Đọc kỹ dữ kiện trong bài báo được cung cấp dưới đây. Không được bịa đặt số liệu, phát ngôn hay sự kiện không có thật.
2. Luôn phân tách rõ ràng cấu trúc phản hồi bằng các nhãn tiếng Việt:
   - [Thông tin trong bài báo]: Những gì bài viết gốc trực tiếp đề cập.
   - [Bối cảnh bổ sung]: Kiến thức nền hoặc dữ kiện lịch sử giúp người đọc hiểu rõ hơn (nếu có).
   - [Nhận định & Dự báo AI]: Phân tích tác động (đặc biệt tới Việt Nam và khu vực nếu liên quan) kèm mức độ bất định.
3. Nếu bài báo chỉ là bản tóm tắt ngắn từ RSS và thiếu chi tiết cụ thể cho câu hỏi, hãy nói rõ giới hạn thông tin từ bản tin gốc trước khi bổ sung bối cảnh.`;

    const contextPrompt = `THÔNG TIN BÀI BÁO ĐANG MỞ:
- Tiêu đề: ${article.title}
- Nguồn báo: ${article.source}
- Thời gian xuất bản: ${article.pubDate}
- Chuyên mục: ${CATEGORY_LABELS[article.category] || article.category}
- Khu vực: ${article.region}
- Nội dung trích xuất: ${article.fullContent || article.description}
- Đường dẫn gốc: ${article.link}

CÂU HỎI CỦA ĐỘC GIẢ: ${questionText}`;

    try {
      const reply = await callAiAssistant({
        systemPrompt,
        userPrompt: contextPrompt,
        history: state.articleChats[artId].slice(0, -1)
      });
      state.articleChats[artId].push({ role: "model", text: reply });
    } catch (err) {
      if (err.message === "CHUA_CAU_HINH_API") {
        state.articleChats[artId].push({
          role: "model",
          text: "⚠️ Bạn chưa kết nối khóa API Trí tuệ nhân tạo (Gemini hoặc OpenAI).\n\nVui lòng vào mục 'Cấu hình kết nối API' ở thanh điều hướng bên trái để nhập khóa miễn phí từ Google AI Studio."
        });
      } else {
        state.articleChats[artId].push({
          role: "model",
          text: `❌ Không thể kết nối tới dịch vụ AI: ${err.message}`
        });
      }
    } finally {
      persistArticleChats();
      renderArticleChatMessages(artId);
      submitBtn.disabled = false;
      submitBtn.textContent = "Gửi";
    }
  }

  /* ==========================================================================
     10. XỬ LÝ SỰ KIỆN TƯƠNG TÁC NGƯỜI DÙNG
     ========================================================================== */
  function switchView(viewName, topicId = null) {
    state.currentView = viewName;
    if (topicId) {
      state.activeTopicId = topicId;
      state.activeTopicTab = "tong-quan";
      state.topicKeywordFilter = "Tất cả";
    }

    document.querySelectorAll(".nav-item").forEach((btn) => {
      const matchStd = btn.dataset.view && btn.dataset.view === viewName;
      const matchTopic = viewName === "chuyen-muc-ca-nhan" && btn.dataset.openMyTopic === state.activeTopicId;
      btn.classList.toggle("active", Boolean(matchStd || matchTopic));
    });

    document.querySelectorAll(".mobile-nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    document.getElementById("left-sidebar").classList.remove("open");
    renderCurrentView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openCustomTopicPage(topicId) {
    const topic = state.myTopics.find((t) => t.id === topicId);
    if (!topic) return;
    switchView("chuyen-muc-ca-nhan", topicId);
    fetchLiveContentForTopic(topic, false);
  }

  function toggleSaveArticle(articleId) {
    const idx = state.savedIds.indexOf(articleId);
    if (idx >= 0) {
      state.savedIds.splice(idx, 1);
      showToast("Đã bỏ lưu bài viết");
    } else {
      state.savedIds.unshift(articleId);
      showToast("Đã lưu bài viết vào danh sách đọc sau");
    }
    persistSaved();
    if (state.activeArticle && state.activeArticle.id === articleId) {
      document.getElementById("reader-save-btn").textContent =
        state.savedIds.includes(articleId) ? "✓ Đã lưu bài viết" : "🔖 Lưu bài viết";
    }
    renderCurrentView();
  }

  async function handleAnalyzeSocialPost(postId) {
    const post = state.socialPosts.find((p) => p.id === postId);
    if (!post) return;

    state.socialAiAnalyses[postId] = "⏳ AI đang phân tích nguyên nhân xu hướng và mức độ kiểm chứng...";
    renderCurrentView();

    const systemPrompt = `Bạn là Chuyên gia Kiểm chứng Thông tin & Phân tích Xu hướng Mạng xã hội của GLOBAL NEWS AI.
Hãy phân tích ngắn gọn, sắc bén bằng tiếng Việt theo 4 gạch đầu dòng:
1. Vì sao nội dung này thu hút chú ý?
2. Bối cảnh / sự kiện đứng sau chủ đề.
3. Mức độ xác thực: Phân biệt rõ đây mới là thảo luận cộng đồng chưa kiểm chứng hay có nguồn báo chí uy tín hậu thuẫn.
4. Cảnh báo rủi ro hiểu lầm hoặc tin giả (nếu có).`;

    const userPrompt = `Nền tảng: Reddit (${post.community})
Tiêu đề bài đăng: ${post.title}
Nội dung tóm tắt: ${post.summary}
Nguồn dẫn đính kèm: ${post.externalDomain}
Tương tác ghi nhận: ${post.upvotes || 0} lượt ủng hộ, ${post.commentsCount || 0} bình luận.`;

    try {
      const reply = await callAiAssistant({ systemPrompt, userPrompt });
      state.socialAiAnalyses[postId] = reply;
    } catch (err) {
      state.socialAiAnalyses[postId] =
        err.message === "CHUA_CAU_HINH_API"
          ? "⚠️ Chưa cấu hình khóa AI. Vui lòng nhập Gemini API Key trong mục 'Cấu hình kết nối API' để bật phân tích xu hướng."
          : `❌ Lỗi phân tích: ${err.message}`;
    }
    renderCurrentView();
  }

  async function handleGenerateDailyBriefing() {
    const out = document.getElementById("daily-briefing-output");
    if (!out) return;
    out.textContent = "⏳ AI đang tổng hợp và biên soạn bản tin thế giới trong ngày...";

    const headlines = state.articles
      .slice(0, 15)
      .map((a, i) => `${i + 1}. [${a.source} - ${CATEGORY_LABELS[a.category]}] ${a.title}: ${a.description.slice(0, 140)}`)
      .join("\n");

    const systemPrompt = `Bạn là Tổng biên tập của GLOBAL NEWS AI. Hãy viết Bản tin Tổng hợp Thế giới Trong Ngày bằng TIẾNG VIỆT (khoảng 3-4 phút đọc), chia rõ các mục:
1. Toàn cảnh Chính trị & An ninh Quốc tế
2. Kinh tế, Thị trường & Thương mại
3. Công nghệ, Khoa học & Xu hướng mới
4. Điểm nhấn Thể thao & Xã hội
5. Góc nhìn tác động đối với Việt Nam
Chỉ tổng hợp dựa trên danh sách tin thật được cung cấp dưới đây, nêu rõ tên hãng tin tương ứng.`;

    try {
      const text = await callAiAssistant({
        systemPrompt,
        userPrompt: `Danh sách tin tức mới nhất hôm nay:\n${headlines}`
      });
      state.dailyBriefingText = text;
      out.textContent = text;
    } catch (err) {
      out.textContent =
        err.message === "CHUA_CAU_HINH_API"
          ? "⚠️ Bạn chưa nhập khóa Gemini API hoặc OpenAI API. Vui lòng mở mục 'Cấu hình kết nối API' để thiết lập."
          : `❌ Không thể tạo bản tin: ${err.message}`;
    }
  }

  async function handleWorldAnalystSubmit(promptText) {
    if (!promptText.trim()) return;
    state.worldChatHistory.push({ role: "user", text: promptText });
    persistWorldChat();
    renderCurrentView();

    const msgBox = document.getElementById("world-analyst-messages");
    if (msgBox) {
      const waitEl = document.createElement("div");
      waitEl.className = "chat-bubble ai";
      waitEl.textContent = "⏳ Đang tổng hợp dữ liệu thời sự và phân tích...";
      msgBox.appendChild(waitEl);
      msgBox.scrollTop = msgBox.scrollHeight;
    }

    const latestContext = state.articles
      .slice(0, 12)
      .map((a) => `- [${a.source}] ${a.title}`)
      .join("\n");

    const systemPrompt = `Bạn là Chuyên gia Phân tích Tình hình Thế giới của GLOBAL NEWS AI.
Trả lời bằng TIẾNG VIỆT mạch lạc, có cấu trúc rõ ràng.
Hãy tham chiếu các bản tin mới nhất đang có trên hệ thống dưới đây nếu liên quan, đồng thời phân biệt rõ đâu là dữ kiện thời sự đã ghi nhận và đâu là nhận định phân tích của AI.

Các tiêu đề tin tức mới nhất hiện có trên tòa soạn:
${latestContext}`;

    try {
      const reply = await callAiAssistant({
        systemPrompt,
        userPrompt: promptText,
        history: state.worldChatHistory.slice(0, -1)
      });
      state.worldChatHistory.push({ role: "model", text: reply });
    } catch (err) {
      state.worldChatHistory.push({
        role: "model",
        text:
          err.message === "CHUA_CAU_HINH_API"
            ? "⚠️ Chưa có khóa API AI. Vui lòng vào mục 'Cấu hình kết nối API' để nhập khóa Gemini API hoặc OpenAI API."
            : `❌ Lỗi kết nối AI: ${err.message}`
      });
    }

    persistWorldChat();
    renderCurrentView();
    const updatedBox = document.getElementById("world-analyst-messages");
    if (updatedBox) updatedBox.scrollTop = updatedBox.scrollHeight;
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcons(savedTheme);
  }

  function updateThemeIcons(theme) {
    const sun = document.getElementById("theme-icon-sun");
    const moon = document.getElementById("theme-icon-moon");
    if (theme === "dark") {
      sun.classList.remove("hidden");
      moon.classList.add("hidden");
    } else {
      sun.classList.add("hidden");
      moon.classList.remove("hidden");
    }
  }

  function bindEvents() {
    document.querySelectorAll(".nav-item, .mobile-nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.view) switchView(btn.dataset.view);
      });
    });

    document.getElementById("logo-home-link").addEventListener("click", (e) => {
      e.preventDefault();
      switchView("trang-chu");
    });

    document.getElementById("mobile-menu-toggle").addEventListener("click", () => {
      document.getElementById("left-sidebar").classList.add("open");
    });

    document.getElementById("close-mobile-menu").addEventListener("click", () => {
      document.getElementById("left-sidebar").classList.remove("open");
    });

    // Nút mở modal Tạo chuyên mục từ sidebar và cột phải
    document.getElementById("sidebar-create-topic-btn").addEventListener("click", () => openTopicEditorModal(null));
    document.getElementById("right-create-topic-btn").addEventListener("click", () => openTopicEditorModal(null));
    document.getElementById("close-topic-modal-btn").addEventListener("click", () => {
      document.getElementById("topic-editor-modal").classList.add("hidden");
    });
    document.getElementById("cancel-topic-modal-btn").addEventListener("click", () => {
      document.getElementById("topic-editor-modal").classList.add("hidden");
    });

    // Nút AI đề xuất từ khóa
    document.getElementById("ai-suggest-keywords-btn").addEventListener("click", handleAiSuggestKeywords);

    // Thêm từ khóa thủ công trong modal
    document.getElementById("add-keyword-btn").addEventListener("click", () => {
      const inp = document.getElementById("topic-keyword-adder");
      const val = inp.value.trim();
      if (val && !state.draftKeywords.includes(val)) {
        state.draftKeywords.push(val);
        inp.value = "";
        renderDraftChips();
      }
    });

    document.getElementById("topic-keyword-adder").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("add-keyword-btn").click();
      }
    });

    // Thêm nhân vật / tổ chức thủ công trong modal
    document.getElementById("add-entity-btn").addEventListener("click", () => {
      const inp = document.getElementById("topic-entity-adder");
      const val = inp.value.trim();
      if (val && !state.draftEntities.includes(val)) {
        state.draftEntities.push(val);
        inp.value = "";
        renderDraftChips();
      }
    });

    document.getElementById("topic-entity-adder").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("add-entity-btn").click();
      }
    });

    // Lưu chuyên mục mới hoặc cập nhật chuyên mục cũ
    document.getElementById("topic-editor-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const editId = document.getElementById("topic-edit-id").value;
      const name = document.getElementById("topic-name-input").value.trim();
      const description = document.getElementById("topic-desc-input").value.trim();
      const region = document.getElementById("topic-region-select").value;
      const sources = {
        press: document.getElementById("src-press").checked,
        social: document.getElementById("src-social").checked,
        video: document.getElementById("src-video").checked
      };
      const notifyLatest = document.getElementById("opt-notify-latest").checked;
      const pinned = document.getElementById("opt-pinned").checked;

      if (!name) return;

      // Nếu người dùng chưa thêm từ khóa nào, tự động lấy chính tên chuyên mục làm từ khóa cơ sở
      const finalKeywords = state.draftKeywords.length > 0 ? [...state.draftKeywords] : [name];

      let targetTopic;
      if (editId) {
        targetTopic = state.myTopics.find((t) => t.id === editId);
        if (targetTopic) {
          targetTopic.name = name;
          targetTopic.description = description;
          targetTopic.region = region;
          targetTopic.keywords = finalKeywords;
          targetTopic.entities = [...state.draftEntities];
          targetTopic.sources = sources;
          targetTopic.notifyLatest = notifyLatest;
          targetTopic.pinned = pinned;
        }
        showToast(`Đã cập nhật chuyên mục "${name}"`);
      } else {
        targetTopic = {
          id: "topic-" + Date.now(),
          name,
          description,
          region,
          keywords: finalKeywords,
          entities: [...state.draftEntities],
          sources,
          notifyLatest,
          pinned,
          order: state.myTopics.length,
          createdAt: new Date().toISOString()
        };
        state.myTopics.push(targetTopic);
        showToast(`Đã tạo chuyên mục "${name}" và bắt đầu thu thập tin!`);
      }

      persistMyTopics();
      document.getElementById("topic-editor-modal").classList.add("hidden");

      if (targetTopic) {
        delete state.topicFeedCache[targetTopic.id];
        openCustomTopicPage(targetTopic.id);
      }
    });

    // Tìm kiếm thông minh
    const searchInput = document.getElementById("global-search-input");
    const clearSearchBtn = document.getElementById("clear-search-btn");
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim();
      clearSearchBtn.classList.toggle("hidden", !state.searchQuery);
      renderCurrentView();
    });

    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      state.searchQuery = "";
      clearSearchBtn.classList.add("hidden");
      renderCurrentView();
    });

    document.getElementById("refresh-feeds-btn").addEventListener("click", () => {
      showToast("Đang đồng bộ tin tức mới nhất từ các hãng thông tấn...");
      loadAllNews(true);
      loadSocialTrends(true);
    });

    document.getElementById("open-world-analyst-btn").addEventListener("click", () => switchView("tro-ly-ai"));
    document.getElementById("right-open-analyst-btn").addEventListener("click", () => switchView("tro-ly-ai"));
    document.getElementById("open-settings-btn").addEventListener("click", () => switchView("cau-hinh-api"));
    document.getElementById("banner-open-settings-btn").addEventListener("click", () => switchView("cau-hinh-api"));

    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      updateThemeIcons(next);
    });

    document.getElementById("close-reader-btn").addEventListener("click", () => {
      document.getElementById("article-reader-modal").classList.add("hidden");
    });

    document.getElementById("reader-save-btn").addEventListener("click", () => {
      if (state.activeArticle) toggleSaveArticle(state.activeArticle.id);
    });

    document.getElementById("toggle-mobile-article-chat").addEventListener("click", () => {
      document.getElementById("reader-ai-pane").classList.add("open");
    });

    document.getElementById("close-mobile-article-chat").addEventListener("click", () => {
      document.getElementById("reader-ai-pane").classList.remove("open");
    });

    document.querySelectorAll("[data-article-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const actionMap = {
          summary: "Hãy tóm tắt ngắn gọn, súc tích những ý chính quan trọng nhất của bài báo này bằng tiếng Việt.",
          translate: "Hãy dịch toàn bộ nội dung bài báo này sang tiếng Việt tự nhiên, chuẩn văn phong báo chí.",
          causes: "Phân tích nguyên nhân cốt lõi và bối cảnh lịch sử dẫn đến sự kiện trong bài báo.",
          vietnam: "Sự kiện này có thể tác động như thế nào đến kinh tế, thương mại hoặc đối ngoại của Việt Nam?",
          perspectives: "Có những góc nhìn trái chiều hoặc tranh luận nào xoay quanh vấn đề này?",
          forecast: "Dự báo các kịch bản có thể xảy ra tiếp theo kèm mức độ bất định."
        };
        const q = actionMap[btn.dataset.articleAction];
        if (q) handleAskAboutArticle(q);
      });
    });

    document.getElementById("article-chat-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("article-chat-input");
      const val = input.value.trim();
      if (val) {
        input.value = "";
        handleAskAboutArticle(val);
      }
    });

    // Event delegation toàn cục
    document.body.addEventListener("click", async (e) => {
      // Mở trang chuyên mục cá nhân
      const openMyTopic = e.target.closest("[data-open-my-topic]");
      if (openMyTopic) {
        openCustomTopicPage(openMyTopic.dataset.openMyTopic);
        return;
      }

      // Chuyển tab trong trang chuyên mục cá nhân
      const topicTab = e.target.closest("[data-topic-tab]");
      if (topicTab) {
        state.activeTopicTab = topicTab.dataset.topicTab;
        renderCurrentView();
        return;
      }

      // Lọc theo từ khóa trong trang chuyên mục cá nhân
      const kwPill = e.target.closest("[data-topic-kw-filter]");
      if (kwPill) {
        state.topicKeywordFilter = kwPill.dataset.topicKwFilter;
        renderCurrentView();
        return;
      }

      // Làm mới dữ liệu chuyên mục cá nhân
      const refreshTopicBtn = e.target.closest("[data-refresh-topic]");
      if (refreshTopicBtn) {
        const t = state.myTopics.find((x) => x.id === refreshTopicBtn.dataset.refreshTopic);
        if (t) {
          showToast(`Đang cập nhật tin mới cho "${t.name}"...`);
          fetchLiveContentForTopic(t, true);
        }
        return;
      }

      // Chỉnh sửa chuyên mục cá nhân
      const editTopicBtn = e.target.closest("[data-edit-topic]");
      if (editTopicBtn) {
        const t = state.myTopics.find((x) => x.id === editTopicBtn.dataset.editTopic);
        if (t) openTopicEditorModal(t);
        return;
      }

      // Ghim / Bỏ ghim chuyên mục
      const pinBtn = e.target.closest("[data-toggle-pin-topic]");
      if (pinBtn) {
        const t = state.myTopics.find((x) => x.id === pinBtn.dataset.togglePinTopic);
        if (t) {
          t.pinned = !t.pinned;
          persistMyTopics();
          renderCurrentView();
          showToast(t.pinned ? `Đã ghim "${t.name}"` : `Đã bỏ ghim "${t.name}"`);
        }
        return;
      }

      // Sắp xếp thứ tự chuyên mục lên/xuống
      const moveUpBtn = e.target.closest("[data-move-topic-up]");
      if (moveUpBtn) {
        const sorted = getSortedTopics();
        const idx = sorted.findIndex((x) => x.id === moveUpBtn.dataset.moveTopicUp);
        if (idx > 0) {
          const temp = sorted[idx - 1];
          sorted[idx - 1] = sorted[idx];
          sorted[idx] = temp;
          sorted.forEach((item, i) => {
            item.order = i;
          });
          state.myTopics = sorted;
          persistMyTopics();
          renderCurrentView();
        }
        return;
      }

      const moveDownBtn = e.target.closest("[data-move-topic-down]");
      if (moveDownBtn) {
        const sorted = getSortedTopics();
        const idx = sorted.findIndex((x) => x.id === moveDownBtn.dataset.moveTopicDown);
        if (idx >= 0 && idx < sorted.length - 1) {
          const temp = sorted[idx + 1];
          sorted[idx + 1] = sorted[idx];
          sorted[idx] = temp;
          sorted.forEach((item, i) => {
            item.order = i;
          });
          state.myTopics = sorted;
          persistMyTopics();
          renderCurrentView();
        }
        return;
      }

      // Xóa chuyên mục
      const delTopicBtn = e.target.closest("[data-delete-topic]");
      if (delTopicBtn) {
        const id = delTopicBtn.dataset.deleteTopic;
        const target = state.myTopics.find((x) => x.id === id);
        if (target && confirm(`Bạn có chắc muốn xóa chuyên mục "${target.name}"?`)) {
          state.myTopics = state.myTopics.filter((x) => x.id !== id);
          delete state.topicFeedCache[id];
          delete state.topicChats[id];
          delete state.topicSynthesis[id];
          persistMyTopics();
          persistTopicChats();
          persistTopicSynthesis();
          renderCurrentView();
          showToast(`Đã xóa chuyên mục "${target.name}"`);
        }
        return;
      }

      // Xóa chip từ khóa / nhân vật trong modal
      const rmKw = e.target.closest("[data-remove-draft-kw]");
      if (rmKw) {
        state.draftKeywords.splice(Number(rmKw.dataset.removeDraftKw), 1);
        renderDraftChips();
        return;
      }

      const rmEnt = e.target.closest("[data-remove-draft-ent]");
      if (rmEnt) {
        state.draftEntities.splice(Number(rmEnt.dataset.removeDraftEnt), 1);
        renderDraftChips();
        return;
      }

      // Chạy báo cáo phân tích AI chuyên mục
      const synthBtn = e.target.closest("[data-run-topic-synthesis]");
      if (synthBtn) {
        handleRunTopicSynthesis(synthBtn.dataset.runTopicSynthesis);
        return;
      }

      // Câu hỏi gợi ý trong chat chuyên mục
      const topicQuickQ = e.target.closest("[data-topic-quick-q]");
      if (topicQuickQ && state.activeTopicId) {
        handleTopicChatSubmit(state.activeTopicId, topicQuickQ.dataset.topicQuickQ);
        return;
      }

      // Xóa lịch sử chat chuyên mục
      const clearTopicChatBtn = e.target.closest("[data-clear-topic-chat]");
      if (clearTopicChatBtn) {
        const tid = clearTopicChatBtn.dataset.clearTopicChat;
        state.topicChats[tid] = [];
        persistTopicChats();
        renderCurrentView();
        return;
      }

      if (e.target.id === "manage-create-topic-btn" || e.target.id === "empty-create-topic-btn") {
        openTopicEditorModal(null);
        return;
      }

      const openArtAi = e.target.closest("[data-open-article-ai]");
      if (openArtAi) {
        e.stopPropagation();
        openArticleReader(openArtAi.dataset.openArticleAi, true);
        return;
      }

      const toggleSave = e.target.closest("[data-toggle-save]");
      if (toggleSave) {
        e.stopPropagation();
        toggleSaveArticle(toggleSave.dataset.toggleSave);
        return;
      }

      const openArt = e.target.closest("[data-open-article]");
      if (openArt) {
        openArticleReader(openArt.dataset.openArticle, false);
        return;
      }

      const regionBtn = e.target.closest("[data-region-filter]");
      if (regionBtn) {
        state.regionFilter = regionBtn.dataset.regionFilter;
        renderCurrentView();
        return;
      }

      const socRegBtn = e.target.closest("[data-social-region]");
      if (socRegBtn) {
        state.socialRegionFilter = socRegBtn.dataset.socialRegion;
        renderCurrentView();
        return;
      }

      const socTopBtn = e.target.closest("[data-social-topic]");
      if (socTopBtn) {
        state.socialTopicFilter = socTopBtn.dataset.socialTopic;
        renderCurrentView();
        return;
      }

      const analyzeSocBtn = e.target.closest("[data-analyze-social]");
      if (analyzeSocBtn) {
        handleAnalyzeSocialPost(analyzeSocBtn.dataset.analyzeSocial);
        return;
      }

      const quickArtQ = e.target.closest("[data-quick-article-q]");
      if (quickArtQ) {
        handleAskAboutArticle(quickArtQ.dataset.quickArticleQ);
        return;
      }

      const rightQuickPrompt = e.target.closest("[data-prompt]");
      if (rightQuickPrompt) {
        switchView("tro-ly-ai");
        handleWorldAnalystSubmit(rightQuickPrompt.dataset.prompt);
        return;
      }

      const worldPromptBtn = e.target.closest("[data-world-prompt]");
      if (worldPromptBtn) {
        handleWorldAnalystSubmit(worldPromptBtn.dataset.worldPrompt);
        return;
      }

      const navLinkBtn = e.target.closest("[data-nav]");
      if (navLinkBtn) {
        switchView(navLinkBtn.dataset.nav);
        return;
      }

      if (e.target.id === "generate-daily-briefing-btn") {
        handleGenerateDailyBriefing();
        return;
      }

      if (e.target.id === "clear-world-chat-btn") {
        state.worldChatHistory = [];
        persistWorldChat();
        renderCurrentView();
        return;
      }

      if (e.target.id === "test-ai-connection-btn") {
        showToast("Đang gửi tín hiệu kiểm tra tới mô hình AI...");
        try {
          const pong = await callAiAssistant({
            systemPrompt: "Trả lời ngắn gọn bằng tiếng Việt.",
            userPrompt: "Xác nhận kết nối thành công với GLOBAL NEWS AI trong 1 câu."
          });
          showToast("Kết nối AI thành công!");
          alert("Phản hồi từ AI:\n" + pong);
        } catch (err) {
          alert("Kiểm tra kết nối thất bại:\n" + err.message);
        }
        return;
      }

      if (e.target.id === "reset-api-settings-btn") {
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
        updateConnectionIndicators();
        renderCurrentView();
        showToast("Đã xóa toàn bộ khóa API khỏi trình duyệt.");
      }
    });

    // Submit các form động
    document.body.addEventListener("submit", (e) => {
      if (e.target.id === "topic-chat-form") {
        e.preventDefault();
        const tid = e.target.dataset.topicId;
        const input = document.getElementById("topic-chat-input");
        const q = input.value.trim();
        if (q && tid) {
          input.value = "";
          handleTopicChatSubmit(tid, q);
        }
      }

      if (e.target.id === "world-analyst-form") {
        e.preventDefault();
        const input = document.getElementById("world-analyst-input");
        const q = input.value.trim();
        if (q) {
          input.value = "";
          handleWorldAnalystSubmit(q);
        }
      }

      if (e.target.id === "api-settings-form") {
        e.preventDefault();
        saveSettings({
          geminiKey: document.getElementById("cfg-gemini-key").value.trim(),
          geminiModel: document.getElementById("cfg-gemini-model").value,
          openaiKey: document.getElementById("cfg-openai-key").value.trim(),
          proxyUrl: document.getElementById("cfg-proxy-url").value.trim()
        });
        showToast("Đã lưu cấu hình kết nối API thành công!");
        renderCurrentView();
      }
    });
  }

  /* ==========================================================================
     11. KHỞI CHẠY ỨNG DỤNG
     ========================================================================== */
  function bootstrap() {
    initTheme();
    loadPersistedUserData();
    updateConnectionIndicators();
    renderSidebarMyTopics();
    renderRightMyTopicsSummary();
    bindEvents();
    renderCurrentView();
    detectVercelServerEnv();
    loadAllNews(false);
    loadSocialTrends(false);
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();
