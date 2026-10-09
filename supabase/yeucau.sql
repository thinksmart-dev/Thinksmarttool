-- ============================================================================
-- NÚT REQUEST: thêm 3 cột vào bảng public.gop_y  (09/10/2026)
-- Chạy file này trong Supabase Dashboard → SQL Editor → Run. Chạy lại an toàn.
--
-- Chủ tool chốt 09/10/2026: nút tròn góc dưới phải thành nút gửi YÊU CẦU, form 3 ô:
--   tiêu đề · nội dung mong muốn · nhóm khách hàng muốn gửi tới
-- và mỗi yêu cầu tự báo vào nhóm Lark của chủ tool.
--
-- ☠️ FILE RIÊNG, CHẠY SAU gopy.sql. Thứ tự dựng lại từ đầu:
--      schema.sql → quyen.sql → gopy.sql → FILE NÀY.
--    Không sửa bảng hay policy nào của schema.sql / quyen.sql.
--
-- ☠️ TỪ ĐÂY TRÌNH DUYỆT KHÔNG TỰ GHI BẢNG NỮA. Mọi yêu cầu đi qua máy chủ
--    (POST /api/yeu-cau trong server.js): máy chủ kiểm phiên đăng nhập, đếm giới
--    hạn 5 yêu cầu / 10 phút, lưu, rồi báo Lark. Vì vậy policy "tự gửi" của gopy.sql
--    bị GỠ ở cuối file: để lại là có một đường gửi vòng qua giới hạn và không báo Lark.
--    Máy chủ ghi bằng service_role nên không cần policy insert nào.
--    Quyền ĐỌC giữ nguyên như gopy.sql: CHỈ super admin.
-- ============================================================================

alter table public.gop_y add column if not exists tieu_de    text;      -- ô 1: tiêu đề
alter table public.gop_y add column if not exists nhom_khach text;      -- ô 3: nhóm khách hàng muốn gửi tới
-- (ô 2 "nội dung mong muốn" dùng lại cột noi_dung có sẵn)

-- Kết quả báo Lark: true = đã báo · false = có link bot mà báo hỏng · null = chưa
-- thử (dòng cũ trước 09/10, hoặc máy chủ chưa cấu hình LARK_WEBHOOK_URL).
alter table public.gop_y add column if not exists lark_ok    boolean;

-- Độ dài khớp YC_TOI_DA trong server.js và TOI_DA trong public/js/gopy.js.
-- Cho phép NULL vì 3 dòng góp ý cũ (17/09) không có hai ô này.
alter table public.gop_y drop constraint if exists gop_y_tieu_de_check;
alter table public.gop_y add  constraint gop_y_tieu_de_check
  check (tieu_de is null or length(btrim(tieu_de)) between 1 and 150);

alter table public.gop_y drop constraint if exists gop_y_nhom_khach_check;
alter table public.gop_y add  constraint gop_y_nhom_khach_check
  check (nhom_khach is null or length(btrim(nhom_khach)) between 1 and 200);

-- Máy chủ đếm "người này gửi mấy yêu cầu trong 10 phút vừa rồi" trước mỗi lần lưu.
create index if not exists gop_y_user_at_idx on public.gop_y (user_id, at desc);

-- Gỡ đường ghi thẳng từ trình duyệt (xem ghi chú ở đầu file).
drop policy if exists "gopy: tự gửi góp ý của mình" on public.gop_y;

-- Báo lớp API của Supabase đọc lại cấu trúc bảng ngay, khỏi chờ nó tự làm mới.
notify pgrst, 'reload schema';
