-- ============================================================================
-- HÒM THƯ GÓP Ý — bảng public.gop_y  (17/09/2026)
-- Chạy file này trong Supabase Dashboard → SQL Editor → Run. Chạy lại an toàn.
--
-- ☠️ FILE RIÊNG, CỐ Ý KHÔNG NHÉT VÀO schema.sql: chủ tool chốt 16/09/2026 rằng
--    phần SQL đã CHUẨN và ĐÃ BÀN GIAO cho dev — nên tính năng mới chỉ được THÊM
--    bảng mới ở file riêng, tuyệt đối không sửa bảng/policy cũ.
--    → Ai dựng lại hệ thống từ đầu: chạy schema.sql → quyen.sql → RỒI CHẠY FILE NÀY.
--      Thiếu file này thì nút Góp ý bấm vào sẽ báo lỗi ghi, không phải "im lặng hỏng".
--
-- ☠️ CHỈ SUPER ADMIN ĐỌC ĐƯỢC — KHÔNG phải is_admin().
--    Chủ tool chốt 17/09/2026: góp ý là của sale gửi riêng cho anh, 11 Admin (chính
--    là quản lý trực tiếp của họ) KHÔNG được đọc. Nới sang is_admin() là đổi bản
--    chất tính năng, không phải "sửa lỗi nhỏ" — phải hỏi chủ tool trước.
--    Giao diện gửi CỐ Ý không ghi câu nào về "ai đọc được" (chủ tool bỏ 17/09/2026),
--    nên hộp không hứa gì cả. Ngày nào thêm một câu như vậy vào giao diện thì câu đó
--    thành LỜI HỨA và phải khớp đúng policy dưới đây.
-- ============================================================================

create table if not exists public.gop_y (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references public.profiles(id) on delete cascade,
  noi_dung text not null,
  trang    text,                                    -- gửi từ trang nào: tool | index | members | videos
  da_doc   boolean     not null default false,      -- super admin đánh dấu đã xử lý
  at       timestamptz not null default now()
);

-- Chặn góp ý rỗng / chỉ toàn khoảng trắng ngay ở tầng CSDL, không chỉ ở giao diện:
-- giao diện chặn được người bấm nhầm, KHÔNG chặn được ai gọi thẳng API.
alter table public.gop_y drop constraint if exists gop_y_noi_dung_check;
alter table public.gop_y add  constraint gop_y_noi_dung_check
  check (length(btrim(noi_dung)) between 1 and 4000);

alter table public.gop_y enable row level security;

-- GỬI: ai đang đăng nhập cũng gửi được, nhưng chỉ gửi DƯỚI TÊN CHÍNH MÌNH.
-- `user_id = auth.uid()` chặn việc gửi mạo danh người khác.
drop policy if exists "gopy: tự gửi góp ý của mình" on public.gop_y;
create policy "gopy: tự gửi góp ý của mình"
  on public.gop_y for insert
  with check (user_id = auth.uid());

-- ĐỌC: CHỈ super admin. Người gửi cũng KHÔNG đọc lại được góp ý của chính mình —
-- cố ý: có đường đọc là có đường dò, chỉ cần biết một id là đoán được người khác.
drop policy if exists "gopy: chi super admin doc" on public.gop_y;
create policy "gopy: chi super admin doc"
  on public.gop_y for select
  using (public.is_super_admin());

-- ĐÁNH DẤU ĐÃ ĐỌC: chỉ super admin.
drop policy if exists "gopy: chi super admin sua" on public.gop_y;
create policy "gopy: chi super admin sua"
  on public.gop_y for update
  using (public.is_super_admin())
  with check (public.is_super_admin());

create index if not exists gop_y_at_idx     on public.gop_y (at desc);
create index if not exists gop_y_chua_doc_idx on public.gop_y (da_doc, at desc);

-- Nấc phát hành (luật CLAUDE.md 2b-bis): mục mới LUÔN bắt đầu ở 'super'.
-- Thiếu dòng này thì bấm đổi nấc trong tab "Khoá mục" không ăn mà cũng KHÔNG báo lỗi
-- (UPDATE khớp 0 dòng vẫn trả 204) — đã vấp đúng thế khi nối Application Form 11/08.
--
-- ☠️ PHẢI GHI RÕ hien_cho = 'super'. Cột này có `default 'all'` (schema.sql:384), nên
--    `insert ... values ('gopy')` trần sẽ tạo dòng nấc 'all' → nút Góp ý hiện NGAY cho
--    cả 77 sale ngay lần đầu chạy. Bắt được lúc soi 17/09/2026 trước khi chạy thật.
--    Luật: đường hỏng phải hỏng về phía GIẤU, không phải phía LỘ.
insert into public.khoa_muc (muc, hien_cho) values ('gopy', 'super')
on conflict (muc) do nothing;
