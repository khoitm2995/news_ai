================================================================================
GLOBAL NEWS AI - PHIÊN BẢN HOÀN CHỈNH CHO GITHUB & VERCEL (GEMINI-3.8-FLASH)
Ứng dụng Đọc báo Quốc tế Tự động Dịch Tiếng Việt, Xu hướng MXH & Chuyên mục AI
================================================================================

1. DANH SÁCH TỆP TRONG GÓI (ĐẶT Ở THƯ MỤC GỐC REPOSITORY GITHUB)
- index.html  : Giao diện tòa soạn tin tức 100% Tiếng Việt.
- style.css   : Giao diện báo chí hiện đại, Sáng/Tối & Responsive di động.
- app.js      : Logic thu thập RSS, tự động dịch bài báo nước ngoài sang tiếng Việt,
                Chuyên mục cá nhân hóa (My Topics) & Trợ lý AI.
- config.js   : Cấu hình nguồn tin & tự động trỏ /api/ai (mặc định gemini-3.8-flash).
- api/ai.js   : Vercel Serverless Function (chuẩn CommonJS) tự động đọc biến môi
                trường GEMINI_API_KEY trên Vercel và hỗ trợ dịch hàng loạt.
- README.txt  : Tài liệu hướng dẫn.

2. CÁCH CẬP NHẬT LÊN GITHUB & VERCEL
- Bước 1: Giải nén toàn bộ tệp này và tải đè (Replace) lên thư mục gốc kho GitHub.
- Bước 2: Trên Vercel -> Settings -> Environment Variables:
          + Đảm bảo đã có biến GEMINI_API_KEY = <khóa API của bạn>.
          + Nếu trước đó bạn có tạo biến GEMINI_MODEL = gemini-2.5-flash thì hãy xóa
            hoặc đổi thành gemini-3.8-flash.
- Bước 3: Vercel sẽ tự động triển khai lại trong ~15 giây.
================================================================================
