================================================================================
GLOBAL NEWS AI - HƯỚNG DẪN ĐẨY LÊN GITHUB & DEPLOY VERCEL
Ứng dụng Đọc báo Quốc tế, Xu hướng Mạng xã hội & Chuyên mục Cá nhân AI
================================================================================

1. CẤU TRÚC THƯ MỤC DỰ ÁN (SẴN SÀNG CHO GITHUB + VERCEL)
- index.html  : Giao diện chính của tòa soạn tin tức (100% Tiếng Việt).
- style.css   : Hệ thống giao diện báo chí hiện đại, hỗ trợ Chế độ Sáng/Tối & Di động.
- app.js      : Toàn bộ logic thu thập tin RSS, Chuyên mục cá nhân hóa (My Topics),
                nhóm sự kiện, lọc xu hướng và tự động nhận diện Vercel Backend.
- config.js   : Tệp cấu hình danh sách nguồn báo chí & tự động trỏ về /api/ai.
- api/ai.js   : Vercel Serverless Function tự động đọc biến môi trường API Key
                trên Vercel để bảo mật khóa, không để lộ trên GitHub.
- README.txt  : Tài liệu hướng dẫn cài đặt và triển khai.

2. HƯỚNG DẪN ĐẨY LÊN GITHUB VÀ GẮN KEY API TRÊN VERCEL
- Bước 1: Giải nén tệp zip này và đẩy toàn bộ các tệp bên trong lên một
          Repository (kho lưu trữ) trên GitHub.
- Bước 2: Đăng nhập Vercel (https://vercel.com), chọn "Add New Project" ->
          Import kho GitHub vừa tạo -> chọn Framework Preset là "Other" -> Deploy.
- Bước 3: Vào tab "Settings" -> "Environment Variables" của dự án trên Vercel:
          + Key  : GEMINI_API_KEY
          + Value: Dán khóa Google Gemini API của bạn (bắt đầu bằng AIzaSy...)
          (Tùy chọn: có thể thêm GEMINI_MODEL = gemini-2.5-flash hoặc OPENAI_API_KEY)
- Bước 4: Vào tab "Deployments" -> nhấn "Redeploy" để Vercel áp dụng khóa API.
          Khi mở trang web, góc trên bên phải sẽ tự động hiển thị trạng thái xanh:
          "AI: Đã kết nối (Vercel Gemini)".
================================================================================
