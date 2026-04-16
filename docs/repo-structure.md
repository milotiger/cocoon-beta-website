# Cấu trúc repo

```
website/
├── index.html          # Site Cocoon — tiếng Việt
├── en.html             # Site Cocoon — tiếng Anh
├── assets/
│   ├── main.css        # Style toàn site
│   └── main.js         # Menu mobile
├── docs/               # Tài liệu (file bạn đang đọc)
└── .gitignore
```

## Luồng chỉnh sửa thường gặp

1. **Đổi nội dung chữ**: sửa `index.html` và/hoặc `en.html` cho đồng bộ hai ngôn ngữ.
2. **Đổi màu / layout / responsive**: sửa `assets/main.css` (biến `:root` cho màu thương hiệu).
3. **Đổi hành vi menu**: sửa `assets/main.js`; đảm bảo HTML vẫn có `data-nav-toggle` và `data-nav-main` trên cả hai trang.
4. **Thêm section mới**: thêm block HTML + `id` neo; thêm mục `<a href="#...">` trong `<nav>`; lặp lại tương ứng trên trang kia với `id`/nhãn phù hợp ngôn ngữ.

## Quy ước đã dùng trong code

- Liên kết tài nguyên: đường dẫn tương đối `assets/...` từ root (cả `index.html` và `en.html` đều ở cùng cấp).
- Class quan trọng: `.site-header`, `.nav-main`, `.nav-lang` (nút đổi ngôn ngữ + icon), `.nav-cta` (Liên hệ / Contact).
- Thư mục phụ thuộc local (ví dụ `node_modules`) nên giữ ngoài git nếu có dùng công cụ npm — xem `.gitignore`.
