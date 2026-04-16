# Tổng quan dự án

## Mục đích

Repo này chứa **website marketing tĩnh** cho **Trường mầm non Cocoon** (Đà Nẵng), định vị là một phần của hệ sinh thái **Stella Education**. Nội dung nhấn mạnh chương trình **100% tiếng Anh**, **hoạt động ngoài trời hàng ngày**, giá trị **EMBRACE** và liên kết hợp lý tới **Stella School** (cấp tiểu học / lộ trình tiếp theo) khi cần.

## Trang “sản phẩm” (site chính)

| File | Ngôn ngữ | Ghi chú |
|------|----------|---------|
| `index.html` | Tiếng Việt (`lang="vi"`) | Trang chủ chính. |
| `en.html` | Tiếng Anh (`lang="en"`) | Bản tiếng Anh đầy đủ; cùng bộ `assets/`. |

Hai trang **liên kết chéo** trong menu (nút ngôn ngữ có icon quả địa cầu) và dùng `<link rel="alternate" hreflang="...">` để gợi ý phiên bản song ngữ cho công cụ tìm kiếm.

## Giao diện và hành vi

- **`assets/main.css`**: toàn bộ style (palette pastel xanh, layout, header cố định, hero, section, responsive, nút CTA, menu).
- **`assets/main.js`**: bật/tắt menu mobile (`initNavToggle` với selector `data-nav-toggle` / `data-nav-main`); đóng menu khi bấm link.

Không dùng framework front-end; chỉnh sửa trực tiếp HTML/CSS/JS.

## Nội dung & CTA

- Các section được neo bằng `id` (ví dụ tiếng Việt: `#gioi-thieu`, `#tuyen-sinh`; tiếng Anh: `#about`, `#admissions`).
- Liên hệ tuyển sinh: số điện thoại dạng `tel:` (và nhãn trợ năng phù hợp) trong phần admissions / liên hệ.

## Môi trường phát triển

- Chạy local: bất kỳ static server nào (ví dụ `npx serve`, `python -m http.server`) từ thư mục gốc repo để tránh vấn đề đường dẫn tương đối tới `assets/`.
