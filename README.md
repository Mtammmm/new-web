# Web Starter — Vite + React + GSAP + Lenis + React Bits

Dự án mẫu để bắt đầu web mới. Mỗi lần làm web mới: copy cả thư mục này, đổi tên, rồi cài.

## Chạy

```bash
npm install     # chỉ cần lần đầu sau khi copy
npm run dev     # mở http://localhost:5173
npm run build   # xuất bản ra thư mục dist/
```

Cần Node.js 18 trở lên.

## Có gì bên trong

| Đường dẫn | Nội dung |
|---|---|
| `src/lib/SmoothScroll.jsx` | Cuộn mượt Lenis, chạy chung vòng lặp với GSAP ScrollTrigger. Đặt một lần ở gốc app. |
| `src/App.jsx` | Trang demo: GSAP timeline có nút điều khiển, ScrollTrigger (pin + cuộn ngang, scrub, `containerAnimation`), Flip, Draggable + Inertia, Lenis (`scrollTo`, thanh tiến độ). |
| `src/components/reactbits/` | 14 component React Bits: `SplitText`, `ScrollReveal`, `ShinyText`, `Magnet`, `Aurora`, `DotGrid`, `GradientText`, `GlitchText`, `TextType`, `SpotlightCard`, `Counter`, `ClickSpark`, `StarBorder`, `FadeContent`. |
| `src/styles.css` | Biến màu và kiểu chữ cơ bản — đổi ở `:root`. |

## Thêm component React Bits khác

Copy file `.jsx` (và `.css` nếu có) từ `Downloads/web-libs/react-bits/src/content/<Nhóm>/<Tên>/`
vào `src/components/reactbits/`. Xem dòng `import` đầu file: nếu component cần thư viện khác
(ví dụ `motion`, `ogl`, `three`) thì chạy `npm install <tên>`.

Bản TypeScript nằm ở `src/ts-default`, bản Tailwind ở `src/tailwind` và `src/ts-tailwind`.

## Giấy phép

Component React Bits theo giấy phép MIT + Commons Clause (xem `src/components/reactbits/LICENSE.md`):
dùng trong sản phẩm của bạn thoải mái, không được đem bán lại chính các component.
