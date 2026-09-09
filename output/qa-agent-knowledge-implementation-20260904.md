# Triển khai điều phối agent và chứng cứ doanh nghiệp — 04/09/2026

## Trạng thái

Đã triển khai phần runtime, quyền chuyển chứng cứ, Admin/API, hướng dẫn memory và trạng thái UI trong source. **Chưa nghiệm thu toàn bộ kế hoạch và chưa áp dụng lên gateway đang sử dụng.**

Giới hạn quan trọng: Codex child chưa có giao thức để host kiểm tra lại quyền ngay trước từng lần sampling/retry nội bộ. Nhánh nhận chứng cứ của Codex hiện từ chối an toàn; không đổi model, provider, runtime hay quyền để né giới hạn. Vì vậy chưa thể đánh dấu C04 đạt đầy đủ trên cấu hình Codex hiện tại.

Baseline được giữ ở [báo cáo kiểm thử ban đầu](qa-combined-agent-knowledge-20260904-results.md). Không dùng kết quả unit/integration để thay cho một lượt QA bằng prompt tự nhiên.

## Những phần đã sửa

| Nhóm                   | Cơ chế thực tế trong source                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kế hoạch và sự đồng ý  | Kế hoạch có định danh/revision, yêu cầu gốc, phần việc, dữ kiện đã xác nhận và trạng thái đồng ý độc lập. Bổ sung thông tin không xóa dữ kiện cũ. Thay đổi phạm vi cần xác nhận đúng phiên bản mới; hủy việc đang chờ đóng kế hoạch cũ. Giữ verifier, TTL và kiểm tra quyền/cấu hình. |
| Thực thi bàn giao      | Model không còn được cung cấp `enterprise_delegate`. Parent đã được admission và writer tiếp nhận gọi dịch vụ spawn dùng chung; không spawn tại HTTP router. Cùng admission dùng lại một kết quả thực thi, không spawn lại khi retry.                                                 |
| Chờ và tiếp tục parent | Dùng registry/settlement hiện có, lưu user/ACK thật vào SQLite với writer/lifecycle fence và anchor thật. Child hoàn thành sớm vẫn được chờ đúng batch. Một phần lỗi không xóa kết quả phần đã chạy.                                                                                  |
| Quyền chứng cứ         | Bảng bổ sung riêng, mặc định rỗng. Admin phân biệt truy cập trực tiếp với nhận trích đoạn khi được giao việc. API giữ Admin, CSRF/origin và CAS revision. Không kế thừa hoặc tự cấp quyền trực tiếp.                                                                                  |
| Chuẩn bị chứng cứ      | Parent dùng đúng công cụ Knowledge được cấp trong phiên nội bộ incognito; chỉ search/get. Lựa chọn JSON strict theo assignment, citation đã get và quote nguyên văn. Không dùng memory, đoán file hay nhận bản viết lại như chứng cứ xác thực.                                        |
| Kiểm tra trước sử dụng | Đúng tài khoản, assignment, chuyên gia, publication/generation/access revision và quyền chuyển. Tối đa 4 đoạn, 1.500 ký tự/đoạn, tổng gói 1.000 token ước tính bảo thủ; vượt giới hạn báo rõ, không cắt ngầm.                                                                         |
| Riêng tư               | Gói process-only, gắn đúng child; task lưu lâu dài không chứa gói. Native HTTP/SSE chèn bản sao ngay trước gửi sau network guard, kiểm tra lại từng retry. Chặn capture/debug proxy, endpoint/transport không hỗ trợ và đích không xác định với `local_only`.                         |
| Thu hồi và restart     | Thay đổi quyền vùng đánh thức kiểm tra/abort lease; mỗi lần gửi còn kiểm tra quyền hiện hành. Hủy parent lúc chuẩn bị đóng đúng kế hoạch. Marker bền vững khiến child cần chứng cứ từ chối nếu restart làm mất lease; không hồi sinh quyền từ transcript.                             |
| Memory và tổng hợp     | Tóm tắt dữ kiện đã hiện trong hội thoại không tìm memory. Thông báo nhân viên không chèn reindex/CLI. Hướng dẫn tách quy định có nguồn, phép tính, đề xuất và điều cần xác nhận; không bịa ngoại lệ.                                                                                  |
| UI skipped             | `status: skipped` ưu tiên trước `isError`; steering hiển thị “Không thực hiện do có cập nhật mới”. Áp dụng cho thẻ tool, nhóm tool và lịch sử; lỗi thật vẫn là lỗi.                                                                                                                   |

Ví dụ đã có kiểm thử tích hợp: yêu cầu tiền mặt có đủ số liệu → hỏi đồng ý → câu đồng ý tự nhiên → tạo đúng một Finance child thật qua canonical spawn/registry. Retry cùng admission không tạo child thứ hai. Đây là bằng chứng runtime/SQLite; transport model của child trong kiểm thử này được mô phỏng, không phải bằng chứng chuyên gia đã suy luận trên dịch vụ model thật.

## Bằng chứng kiểm tra

- RED trước sửa đã xác nhận: model có thể bỏ qua bàn giao, mất ACK phần lỗi, thiếu callback quyền khi finalization, log/debug nhận nội dung riêng tư, trạng thái skipped bị hiểu là lỗi, và lỗi memory chèn hướng dẫn vận hành.
- Một cửa sổ runtime/quyền/API/schema/router/Codex gồm **26 file, 484 tests đạt**, bao gồm đồng ý qua router và verifier, child canonical thực tế, child hoàn thành sớm, batch khôi phục từ SQLite, ACK/writer fence, lỗi telemetry sau khi child được tiếp nhận và chống lộ trích đoạn trong lỗi SSE. Số 584 trong cập nhật tạm thời là lỗi cộng, đã được đính chính.
- Sau khi hoàn thiện kiểu fixture, 5 file liên quan chạy lại **27 tests đạt**. Sau khi bỏ ép kiểu ở parser/request boundary, 5 file chạy lại **118 tests đạt**. Đây là các lần chạy lặp, không cộng thành số test độc lập.
- UI và memory chạy riêng trước sửa import: **7 file UI / 90 tests đạt**, **5 file memory / 108 tests đạt**. Lượt cuối bên dưới có thêm hai test nhãn EN/VI và một test cleanup.
- Native wire: endpoint HTTP cục bộ thực sự nhận request qua SDK/transport native; kiểm tra gói không nằm trong context/capture trước gửi, retry kiểm tra lại quyền, lỗi HTTP và SSE không được đưa nguyên văn trích đoạn vào lỗi/diagnostics. Đây không phải vendor-model/browser QA.
- Tương thích database **new → old → new đạt**: ba Node process độc lập; mã cũ từ commit `f567de7d3bd38b624f176fa5ba37e13dcfe9fa1c` mở và ghi database mới, rồi mã mới mở lại. Quyền/revision giữ nguyên; old write đọc được; `user_version=9`, FK check không lỗi, `integrity_check=ok`.
- Harness tái lập database: [database-compat.mjs](/Users/hieunguyenduc/workplace/outsource/assistant-tl/output/enterprise-delegation-qa/database-compat.mjs). Thư mục bằng chứng tạm: `/private/var/folders/m4/71w5wnxs0tjd2cdkbcc7846m0000gn/T/openclaw-enterprise-db-compat-6Xy7zS`.

## Cổng còn chưa hoàn tất

1. Codex private evidence cần hợp đồng upstream per-send: xem [phân tích ranh giới runtime](qa-private-model-context-runtime-constraints.md). Không sử dụng `additionalContext` làm đường dự phòng vì nó tồn tại trong lịch sử native và không tái kiểm tra quyền cho từng retry.
2. Chưa có E2E toàn bộ bước private preparation với selected native/Codex harness và dữ liệu QA, hoặc bộ 10 case + onboarding chạy đủ baseline và hai cách diễn đạt khác trên gateway riêng.
3. Chưa smoke phiên Chrome User/Admin trên gateway đang sử dụng. Đã xác nhận các tab Chrome hiện hữu; không đổi dữ liệu hoặc gửi prompt vào gateway đó trong lượt triển khai.
4. `autoreview` helper bị chặn bởi thiếu TruffleHog. Không bỏ qua scanner, không tự cài đặt; review thủ công/độc lập không được gọi là cổng structured autoreview đã đạt. Skill `behavior-validator` được tham chiếu bởi repo nhưng không có file khả dụng.
5. Các cổng toàn nhánh chưa sạch: `check:changed` dừng ở assertion SAFETY ratchet với nhiều file Enterprise/Plugins hiện hữu; các ép kiểu trong owner mới đã được thay bằng kiểm tra kiểu thực. Test-type shard `other` còn `plugin-approval-service.test.ts:162` dùng generic `toMatchObject`, đã xác minh tồn tại nguyên dòng ở Git HEAD. Lỗi UI baseline: 6 key Knowledge trùng ở mỗi locale và cast `ApplicationContext` ở `models-page.ts`; không sửa lan sang các việc khác. Cửa sổ type/lint/build cuối của phần triển khai được ghi riêng bên dưới.
6. Hủy tự nhiên sau khi kế hoạch đã yield không phải luồng mới được bổ sung. Hủy đang chờ, abort parent lúc chuẩn bị và điều khiển hủy child hiện có vẫn tách biệt. Không suy luận một câu hỏi mới là quyền hủy child cũ.

## Giới hạn vận hành được giữ

Không restart/deploy gateway, sửa publication QA, bật quyền trên môi trường đang sử dụng, đổi model/provider, sửa index live hoặc reindex toàn bộ agent. Personal/Finance index vẫn cần quy trình xác định đúng đích và duyệt vận hành riêng. Không hứa xóa được thông tin đã xuất hiện trong câu trả lời trước khi thu hồi quyền.

Sau khi các cổng kỹ thuật đạt và phạm vi upstream được duyệt, bước tiếp là nghiệm thu trên gateway riêng/bản sao QA, chấm riêng định tuyến, child, chứng cứ, nội dung và UI. Chỉ sau đó mới xin phép áp dụng và smoke bằng Chrome User/Admin hiện có.

## Phát hiện thêm từ build và review

- Ghi telemetry thất bại sau spawn từng làm coordinator mất batch đã được chấp nhận. Đã giữ batch/lease để settlement tiếp tục; cảnh báo chỉ có định danh và số lượng. Không hứa audit/count vẫn đầy đủ nếu chính database audit lỗi.
- UI build thật phát hiện hai import nhãn skipped kéo toàn bộ từ điển Enterprise vào chunk chat: 39.507 byte mã mới trong chunk, chiếm 98,3% mức tăng mã. Clean HEAD đạt 214,0 KiB gzip; bản có import sai lên 225,4 KiB, vượt ngưỡng 215 KiB. Đã chuyển đúng ba nhãn sang owner chat nhỏ hiện có; không nâng budget hoặc thay chunk config. Kết quả build lại được ghi trong cửa sổ cuối.
- Các owner mới được đóng lint ở đúng nơi: router tách orchestration/state/effects/context nhưng giữ một kho trạng thái; hàng đợi post-commit tách khỏi DB bootstrap nhưng không đổi transaction/rollback hoặc schema. Không tạo đường spawn hay đường tri thức dự phòng.

## Cửa sổ xác minh cuối

Sau các sửa runtime, cleanup, tách owner và import UI: **38 file / 685 tests đạt**, qua 11 shard tuần tự của wrapper dự án.

| Nhóm chạy                                          | File | Tests đạt |
| -------------------------------------------------- | ---: | --------: |
| Unit fast / capture                                |    1 |        23 |
| Unit: router, store, quyền, API, schema, bootstrap |   10 |       130 |
| Private observations                               |    1 |         3 |
| Agent core / model HTTP-SSE / evidence             |    5 |       135 |
| Admitted backend, durable child, preparation       |    3 |        19 |
| Harness, ACK/transcript, selection                 |    3 |       134 |
| Plugin observation boundary                        |    1 |         1 |
| UI                                                 |    6 |        75 |
| UI isolated                                        |    1 |        17 |
| Codex hooks/connection                             |    2 |        40 |
| Memory                                             |    5 |       108 |

Chạy thêm bằng đúng owner config để không bỏ sót file chưa tracked: hai tool suite **8 tests đạt**, outer embedded routing **1 test đạt**, terminal callback **2 tests đạt**. Không dùng tổng này thay cho chấm C01–C10 bằng model và trình duyệt thật.

| Cổng                                                                | Kết quả                                                                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm tsgo:core`, `pnpm tsgo:extensions`                            | Đạt trên source cuối                                                                                                  |
| Agent test types: `agents-root`, `agents-other`                     | Đạt trên source cuối                                                                                                  |
| `tsconfig.extensions.test.json`                                     | Đạt trong lượt triển khai                                                                                             |
| Typed lint 16 owner runtime/router/evidence/state                   | Đạt; không thêm suppression                                                                                           |
| Schema version guard / `git diff --check`                           | Đạt; schema vẫn v9                                                                                                    |
| `pnpm build`                                                        | Đạt toàn bộ trong `/tmp/openclaw-qa-build.AQ9Uks`, 3 phút 12,7 giây; không build vào `dist` của checkout đang sử dụng |
| UI performance                                                      | Đạt: JS lớn nhất 214,3 KiB / ngưỡng 215 KiB; 880 sidecar được xác minh                                                |
| Type UI toàn nhánh                                                  | Chưa đạt vì 13 lỗi baseline đã nêu                                                                                    |
| Test-type `other`                                                   | Chưa đạt vì generic `toMatchObject` ở test Plugins đã có trong HEAD                                                   |
| `check:changed` mặc định so `origin/main`                           | Dừng ở assertion ratchet của nhánh hiện hữu; không gọi là đã đạt toàn gate                                            |
| Lint hai UI owner lớn                                               | Baseline đã vượt 700: API 1.146 → 1.164 dòng, controller 704 → 815 dòng; cần refactor riêng, chưa thay budget         |
| Structured autoreview                                               | Bị chặn: máy thiếu TruffleHog; không bỏ qua scanner                                                                   |
| QA tự nhiên / Chrome User–Admin / private prep selected-harness E2E | Chưa thực hiện lại sau sửa                                                                                            |

Build dùng bản sao source và các dependency đã cài, không dùng database hoặc thông tin đăng nhập live. Lần đầu dựng bản sao thiếu dependency riêng của UI nên resolve nhầm `pako`; đã nối đúng dependency UI hiện hữu rồi chạy lại. Bản Git HEAD độc lập trong `/tmp/openclaw-ui-baseline.g2C0CH` được build để đối chiếu hiệu năng, không hoàn nguyên checkout người dùng.

Kiểm tra assertion ratchet riêng với `--base HEAD` vẫn còn 4 file trong working tree: `enterprise-http.ts`, `entitlement-store.ts`, `enterprise-user-methods.ts`, `knowledge-publication-store.ts`. Owner mới router/private-context đã hết lỗi này. Không đổi baseline để làm xanh.

## Phần cần quyết định tiếp

Muốn hoàn tất C04 trên Codex mà vẫn giữ nguyên model và các yêu cầu riêng tư, cần duyệt mở rộng sang mã nguồn/giao thức runtime Codex và quy trình build binary tương ứng. Chưa sửa repository Codex, chưa thay binary được gateway sử dụng. Sau đó mới kiểm chứng chuỗi thật: parent search/get → server xác minh → đúng child nhận gói ở từng model send → child trả kết quả → parent tổng hợp; rồi chạy baseline + hai cách diễn đạt tự nhiên trên bản sao QA.
