================================================================================
GLOBAL NEWS AI - PHIÊN BẢN V7 (SỬA LỖI TRÙNG BÀI & CHUYÊN MỤC CÁ NHÂN)
================================================================================
1. CẤU TRÚC TỆP ĐẨY LÊN GITHUB:
   - index.html
   - style.css
   - app.js
   - config.js
   - api/ai.js    (Xử lý Gemini 3.8 Flash & dịch tiêu đề/sapo)
   - api/news.js  (MỚI: Truy vấn trực tiếp Google News Search & Bing News Search
                   từ máy chủ Vercel để đổ tin vào "Chuyên mục của tôi")

2. ĐIỂM CẢI TIẾN CHÍNH:
   - Khử trùng lặp 2 tầng (cả lúc nạp dữ liệu lẫn lúc hiển thị và sau khi dịch
     tiếng Việt), loại bỏ hoàn toàn các bài trùng từ Al Jazeera / NYT / Google.
   - Bổ sung endpoint /api/news trên Vercel giúp các chuyên mục cá nhân tự tạo
     luôn thu thập được tin tức mới nhất mà không bị chặn bởi rss2json.
================================================================================
