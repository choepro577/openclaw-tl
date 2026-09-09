# Enterprise Knowledge — live acceptance 2026-09-04

## Scope and safety

- Existing Chrome Admin and Hiếu DZ (`hieu`) sessions, local gateway 18789.
- User explicitly authorizes creating varied test knowledge and binding every zone to this user's Personal Agent.
- All corpus content marked `[KIỂM THỬ]` / `[QA]`, fictional Sao Mai/Aurora Desk, no real policies or credentials.
- Starting inventory: zero zones. Existing assignments, chats and business data remain intact.
- Current readiness: FTS ready; vector unconfigured; graph globally off. No remote ingestion consent added.

## Kết quả nghiệm thu thực tế

Đã tạo **5 zone / 10 tài liệu** bằng Admin UI và gán cả 5 cho Personal Agent **Hiếu DZ (`hieu`)**. Không tạo tài khoản demo, không cấp cho Shared Agent, không sửa trực tiếp DB đang chạy. Các lần kiểm tra quyền và câu trả lời đều sử dụng phiên user Chrome có sẵn.

Tab Admin ban đầu bị treo khi điều khiển hộp thoại native; đã mở tab quản trị trong **cùng Chrome và cùng phiên đăng nhập Admin**, không tạo browser context hoặc đăng nhập thay thế. Giữ nguyên tab user ban đầu.

### Chuỗi kiểm chứng quyền và phiên bản

1. Khi HR-01 v1 được publish, user đọc được **7 ngày / HR-ASTER-27**.
2. Admin tạo HR-01 v2 **9 ngày / HR-BLOOM-91** nhưng chưa publish: Admin tìm thấy bản mới trên candidate; user tìm mới vẫn nhận v1.
3. Publish HR-01 v2: user tìm và đọc nguồn mới, nhận **9 ngày / HR-BLOOM-91 / version 2**.
4. Admin bỏ binding CNTT của Hiếu, mở hội thoại user mới: audit xác nhận **searchedZones=4**, không có nguồn CNTT; user không đoán số ngày backup, vẫn đọc được hạn quyết toán **5 ngày làm việc** từ Tài chính.
5. Cấp lại CNTT: không đăng nhập lại; request tiếp theo tìm **5 zone**, đọc IT-02 và trả **35 ngày**.
6. Khôi phục HR publication #1 bằng dialog mới: Escape không thay đổi dữ liệu, focus trả về nút Rollback. Xác nhận mới gọi API; active publication chuyển từ #2 sang #1, revision 7→8, tổng publication vẫn là 2. User tìm mới trả lại **7 ngày / HR-ASTER-27 / version 1**.

Hội thoại bằng chứng: `/app/chat/enterprise-personal-2ae2cbc2deecdb86fe86/27cb58be` (Chrome có thể thêm slug vào URL). Hội thoại các câu hỏi đa zone và draft/publish: `/app/chat/enterprise-personal-2ae2cbc2deecdb86fe86/411310d4`.

### Đối chiếu câu trả lời với dữ liệu đã nhập

| Câu hỏi                                          | Kết quả đã quan sát trong user chat                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| MẦM XANH và điều kiện hoàn thành                 | 7 ngày, 20 câu, ít nhất 16 câu đúng; ghi rõ nguồn kiểm thử                                           |
| Công tác 3 ngày 2 đêm                            | Khách sạn 1.700.000 + ăn 660.000 = **2.360.000 đồng**, chưa đi lại; quyết toán trong 5 ngày làm việc |
| Aurora Desk Growth trả năm                       | 990.000 × 12 × 88% = **10.454.400 đồng**, chưa thuế; 20 user, 100 GB                                 |
| Hợp đồng 20 triệu có dữ liệu khách hàng          | Vẫn cần Pháp chế; hồ sơ đủ: 3 ngày thường, 7 ngày xuyên biên giới                                    |
| NDA và truy cập vendor                           | SM-NDA-2026 trước truy cập; tài khoản tối đa 14 ngày; MFA trong ngày nhận; NDA không thay DPA        |
| Thưởng Tết / cam kết Zalo / bồi thường gián đoạn | Nêu không có dữ liệu hoặc chưa có cam kết, không tự đưa số tiền/chính sách                           |
| Backup sau revoke/regrant                        | Không có nguồn khi revoke; 35 ngày sau regrant                                                       |

## QA inventory

| Claim / control                         | Functional check                                           | Visual state / evidence                                    | Status                               |
| --------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Correct existing sessions               | Admin identity and Hiếu DZ identity visible                | Admin sidebar and user sidebar                             | Passed                               |
| Create zones + initial Personal binding | Five zones, exact Hiếu DZ checkbox                         | Create form, zone overview / Agent access                  | Passed                               |
| Note ingestion                          | Two varied notes per zone, durable processing to ready     | Source list and jobs                                       | Passed                               |
| Candidate isolation                     | Draft v2 stays invisible to user until published           | User exact fresh search/get                                | Passed                               |
| Preview + FTS-only publish              | Search every candidate; explicit audited reason            | Candidate results, published state                         | Passed                               |
| Retrieval in all five zones             | Unique factual questions with exact get and citations      | User answer + source opening                               | Passed                               |
| Multi-zone reasoning                    | Finance + Product; Legal + IT                              | Answer distinguishes sources                               | Passed                               |
| Missing knowledge                       | Ask nonexistent benefit/integration                        | Explicit no-evidence, no invented policy                   | Passed                               |
| Publication update / rollback           | Draft invisible, publish changes result, rollback restores | Version + publication + user answer                        | Passed                               |
| Binding revoke / restore                | Current tools cannot read revoked zone, restore recovers   | Agent access + fresh user query                            | Passed                               |
| Input failures / empty search           | Empty create rejected; nonsense candidate query            | Live focus at invalid name input; explicit no-match status | Passed                               |
| Usability and visual fit                | Source cards, Admin modal, keyboard Escape/Enter           | Desktop user; Admin 390px without page overflow            | Scoped pass; exclusions below        |
| Health                                  | Doctor / jobs and focused module regressions               | 0 integrity issues, 0 queued/running/stuck                 | Passed, historical failures retained |

## Test corpus

Five zones, each with two documents, bound only to Hiếu DZ Personal Agent initially:

- `qa-nhan-su-20260904`: HR-01 onboarding MẦM XANH (7 working days, 16/20 pass, 30-day buddy); HR-02 leave (15 days, 4 carried to March 31), remote work and training.
- `qa-tai-chinh-20260904`: FIN-01 travel (850,000/night, 220,000/day, 5-day expense deadline); FIN-02 training (3,600,000/year), procurement thresholds.
- `qa-phap-che-20260904`: LEG-01 contract review (50,000,000 threshold OR customer data, 3/7-day review, 6-year retention); LEG-02 NDA and vendor onboarding.
- `qa-cntt-20260904`: IT-01 equipment (4-day lead, 16 GB/512 GB), P1/P2/P3 support; IT-02 MFA, 14-day vendor access, 35-day backup retention.
- `qa-san-pham-20260904`: PROD-01 fictional Aurora Desk tiers (390,000/990,000, 12% annual discount); CS-01 response and refund conditions.

## Findings and changes

| Nguyên nhân đã xác minh                                                                                      | Sửa tại owner                                             | Tác động thực tế                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Personal resource key bị xử lý như Shared entitlement; account không có explicit Personal allow thông thường | `entitlement-store.ts`, projection của Enterprise gateway | Xác minh owner/account/Personal state, deny thắng; không phải tạo grant giả                                                 |
| Personal request không nhận bộ tool tri thức dù có published zone hợp lệ                                     | `enterprise-gateway-policy.ts`                            | Chỉ thêm search/get cho đúng request/Agent có quyền; không mở raw spawn/list hay nới sandbox                                |
| Router trả rỗng vẫn ép hỏi điều phối                                                                         | `delegation-router.ts`                                    | Không có candidate phù hợp thì Personal tự xử lý bằng tool được cấp                                                         |
| Model tự truyền zoneSlug `all` và tìm trong zone không tồn tại                                               | Schema/mô tả `enterprise-knowledge-tools.ts`              | Omit/null là tìm tất cả zone được phép; `all` không trở thành bypass quyền                                                  |
| Build cũ đụng revision mới bị ghi failed STALE_BUILD                                                         | Worker + generation store                                 | Supersede/coalesce công việc, không đánh lỗi parser giả; lỗi parser/provider thật vẫn failed                                |
| Detail/search cũ ghi đè drawer mới, đóng drawer rồi mutation lại mở drawer                                   | Admin/User knowledge controllers                          | Snapshot/request fences, clear candidate hits, giữ đúng zone/tab                                                            |
| Admin HTTP-only không có gateway context nên realtime không được khởi động                                   | Knowledge realtime owner + Admin state                    | Durable HTTP feed hoạt động; đã thấy candidate CNTT queued→complete không reload                                            |
| Tool knowledge hiện raw payload hoặc khó đọc                                                                 | Chat knowledge card + grouping                            | Hiện số zone/tài liệu, tên nguồn, version, bằng chứng; không render signed token, instructions hoặc raw JSON                |
| Native rollback khó thao tác và mô tả sai là tạo publication mới                                             | In-app Admin dialog                                       | Xác nhận đúng zone/#; CAS, chống double submit, Escape/focus; live rollback đạt                                             |
| Tìm thử không có hit thì UI im lặng; submit lỗi vẫn giữ focus cuối form                                      | Admin search state + create controller                    | Hiện thông báo zero-hit sau request đúng candidate; đưa focus về input `name` với `aria-invalid=true`; cả hai đã rerun live |

Các thẻ nguồn được mở bằng bàn phím và cuộn thực tế trong user chat; đã đọc được nội dung HR-01 v1 đúng với câu trả lời. Ảnh: [User evidence](knowledge-user-evidence-2026-09-04.png).

Ảnh Admin: [Danh sách zone](knowledge-admin-zones-2026-09-04.png), [Trạng thái không có kết quả](knowledge-admin-empty-2026-09-04.png).

## Test và build

Các lượt dưới đây có phần chồng lặp; không cộng thành số test độc lập:

- Core quyền / isolation / Router / worker: **64 test, 7 file PASS** (`/tmp/openclaw-knowledge-core-postfix.log`).
- Toàn thư mục Knowledge + knowledge tool: **44 test, 14 file PASS** (`/tmp/openclaw-knowledge-module.log`).
- UI Knowledge / chat / grouping: **318 test, 10 file PASS** trước bổ sung modal (`/tmp/openclaw-knowledge-ui-final.log`).
- Modal rollback + lifecycle + relevant UI: **44 test, 6 file PASS**, trong đó 9 rollback test (`/tmp/openclaw-knowledge-rollback-postfix.log`). Trước sửa: 8/9 rollback test thất bại như kỳ vọng.
- Vòng cuối gồm modal, empty result, focus validation và toàn bộ nhóm UI trên: **330 test, 11 file PASS** (`/tmp/openclaw-knowledge-ui-acceptance.log`). Ba test empty/focus FAIL trước sửa, PASS sau sửa.
- Core typecheck: **PASS** (`/tmp/openclaw-knowledge-core-typecheck-final.log`).
- `ui:i18n:baseline`, `ui:i18n:verify`, `lint:ui:styles`, `ui:build`: **PASS**. Không chỉnh ignore/snapshot để che lỗi.
- Vòng build cuối: `/tmp/openclaw-knowledge-final-gates.log`, `/tmp/openclaw-knowledge-final-build.log`, exit 0. Gateway phục vụ `index-CUrJcCfY.js` khớp file build, SHA-256 **078518f3a08afd277e727dd575051f8341f8e1bf658626c476d5a0071f3dc195**. Đã reload Admin và kiểm chứng empty/focus trên đúng asset này.
- `tsgo:ui`: **không đạt do lỗi có sẵn**: trùng key ở `ui/src/i18n/enterprise-user.ts` (đã đối chiếu HEAD), thiếu fields ApplicationContext ở `enterprise-admin/pages/models-page.ts` (file không bị sửa trong task). Không tính là full-project green.

## Trạng thái hệ thống và giới hạn bằng chứng

- Cả 5 zone đang active, published và bound **chỉ Personal của Hiếu**; tất cả `local_only`.
- HR đang dùng publication #1; v2 vẫn được giữ trong lịch sử, không xóa nguồn.
- Candidate CNTT mới `31ed76fb-bd2f-4aee-b92b-258e96e633dd` đã ready nhưng chưa publish; publication #1 vẫn phục vụ user. Dữ liệu nguồn không đổi.
- Doctor: **0 artifact lỗi / 22 checked; 0 queued / running / stuck; Search p95 8 ms** tại lần kiểm tra. Hai STALE_BUILD lịch sử trước fix vẫn được giữ, không xóa để làm sạch dashboard. Read-only DB cuối vòng: 19 succeeded, 2 failed lịch sử.
- Live acceptance là **text ingestion + FTS**. Vector chưa cấu hình; graph global off; remote OCR bị `local_only` chặn. Chưa nghiệm thu OCR scan, embedding/vector, Graph enrichment hoặc upload mọi định dạng.
- Đã nhìn trực tiếp user desktop và Admin modal 390×844; document không tràn ngang ở các trạng thái đã đo. Bảng Admin có vùng cuộn nội bộ. Viewport override không áp dụng lên tab user có sẵn (đo vẫn 1920×907), nên **không tuyên bố user 390px đã đạt**. Chưa chạy toàn bộ light/zoom200%/screen-reader matrix. Override đã được reset.
- Chuỗi UI mới theo canonical English/i18n flow; bản dịch sinh tự động chưa chạy. Một số chữ mới đang fallback tiếng Anh; không tự sửa translation memory.
- Không chạy lại toàn bộ repo/full release gates và không tuyên bố GA mọi tính năng. Không sửa hoặc nâng runtime Codex trong vòng Knowledge này.

## Phạm vi thay đổi source

Giữ nguyên dirty worktree; chỉ sửa owner của những lỗi quan sát được và thêm regression tương ứng. `git diff --numstat`/`--check` đã được kiểm tra theo file trong phạm vi; số dòng so với HEAD còn bao gồm thay đổi từ trước nên không gán toàn bộ cho vòng test này. Phần production tăng chủ yếu để có renderer bằng chứng allowlist (ẩn token/raw instructions), xác nhận rollback có CAS, và lifecycle fences tránh phản hồi cũ ghi đè. Không thêm bảng quyền song song, endpoint bypass, hoặc test-only production seam.
