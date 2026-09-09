# Kiểm thử lại điều phối agent và tri thức doanh nghiệp — 04/09/2026

Trạng thái: **đã dừng chạy chuỗi dài theo yêu cầu mới của người dùng**. A/B đã hỏi và ghi nhận đủ 11 case mỗi lượt; C chỉ hỏi C01–C02 (**2/11**), C03–C11 chưa chạy. Chưa đạt nghiệm thu; không tuyên bố đã hoàn tất 33 case.

## Tiếp tục không hỏi lại bước thông thường — C03 riêng lúc 22:49–22:51

### Case đang sửa: C04 riêng lúc 23:01

- Chat `0e9025ed`, prompt tự nhiên C04 có đủ toàn bộ dữ kiện công tác và mã BT-0904 ngay từ đầu; không nhắc công cụ, chuyên gia hay nguồn. Hệ thống báo phương án không hợp lệ, yêu cầu làm rõ; `router_target_invalid`, 0 plan, 0 child, chưa tra cứu. Không gửi lời đồng ý để cố ép qua lỗi. [Bằng chứng](qa-fix-c04-20260904-invalid-plan-evidence.json).
- Đã dừng tiến sang C05–C11 theo chiến thuật sửa từng case. Mã lỗi hiện gộp unknown target và sai grounding input; audit chỉ lưu targets hợp lệ đã chọn, không lưu router JSON. Vì vậy chưa đủ bằng chứng kết luận chính xác trường sai ở lần chạy này. Đang bổ sung mã chẩn đoán cố định tại validator, không ghi nguồn/văn bản/quyền vào log, không nới kiểm tra.
- Admin Chrome sau reload: Models và Model Setup tải được bằng context mới. Model Setup hiển thị OpenAI GPT-5.6 Sol, không bấm Check/Test/Save/login/logout. Trang Models hiển thị cấu hình default Luna và profile aggregate Expired; không xem nhãn tổng hợp này là lỗi xác thực hiện tại của pin Sol đã chạy thành công. Theo dõi riêng nếu cần giải thích phân biệt default/effective/auth-profile.

### Kết quả sửa và thử lại 22:58–23:02

- C03 mới `9daee8ef`: giữ nguyên prompt B và đúng một lời đồng ý. Một kế hoạch được chọn/xác nhận; một Finance child `6a907c65-c0d8-4006-8397-65405aa75c6c`, kết thúc `ok`; parent nhận kết quả lúc 22:59:53. Đúng 204/294 triệu, hòa vốn 120 triệu; tiền cọc tách khỏi tiền mặt. Không memory/tri thức thừa.
- Lỗi gốc: host-managed turn đã ghi transcript nhưng thiếu execution phase; gateway tưởng chưa có runtime xử lý và ghi ACK lần hai. Sửa producer phát `turn_accepted`/`assistant_output_started`, giữ kiểm tra authority. Không thêm đường bàn giao hoặc lọc trùng theo văn bản ở UI. Regression đỏ 2/6 trước sửa, xanh 38/38 sau sửa; production tăng 6 dòng cho lifecycle contract.
- Chrome live và disclosure lịch sử sau reload đều chỉ có **một ACK**, không còn quote giả. Transcript cũng chỉ có một `host-response`; `gateway-injected` chỉ còn câu hỏi xác nhận hợp lệ. [Bằng chứng retest riêng](qa-fix-c03-20260904-retest-evidence.json). Lượt lỗi trước vẫn được giữ bên dưới, không thay kết quả cũ thành đạt.
- Gateway hiện PID 71219, build 22:55:22 và UI 22:55:35; thay đổi này xảy ra ngoài thao tác của agent. Agent chỉ kiểm tra bundle có bản sửa, không tự build/restart dịch vụ đang dùng.
- Sửa typecheck: bỏ khóa dịch bị ghi đè nhưng giữ nguyên giá trị cuối; Admin Models dùng context hẹp đúng capability, không giả full ApplicationContext. UI typecheck và core typecheck đạt. 8 tệp UI node/jsdom đạt **527/527**; không dùng Playwright cho kiểm thử Chrome.
- Autoreview mới: TruffleHog 3.96.0 clean; helper dừng trước reviewer vì toàn dirty bundle vượt giới hạn 8 bounded passes. Chưa có verdict autoreview, không được coi là review đạt. Không commit/deploy. Artifact `/tmp/openclaw-c02-c03-autoreview.MbcDLK/gate-result.json`.

- Đã cài TruffleHog 3.96.0 qua Homebrew theo hướng dẫn chính thức, không bật trust cho tap ngoài và không đổi dependency dự án. Hai lỗi typecheck UI đang được xử lý riêng; chưa build/restart gateway hoặc thay quyền dữ liệu.
- Đã hỏi C03 bằng prompt tự nhiên đầy đủ trong chat riêng `bf2877f7` trên đúng tab Chrome User. Chỉ trả lời **một lần** “Ừ, bạn xem giúp mình nhé.” Không chỉ định công cụ/chuyên gia, không gửi thêm dữ kiện hoặc thúc chạy.
- **Định tuyến và child đạt:** 1 selected plan, 1 confirmed plan, đúng 1 Finance child `f780f5a5-bc9d-4c8a-b922-920ba52359a0`, được tiếp nhận 22:50:20, kết thúc `ok` 22:50:40. Parent tự tiếp tục và có đáp án cuối 22:51:03; không phải parent tự tính thay cho child. Child thực chạy OpenAI GPT-5.6 Luna theo cấu hình hiện có, parent tổng hợp bằng Sol; không đổi model.
- **Đầu vào/nội dung đạt:** transcript child có đủ số liệu gốc; câu trả lời model thật tính đúng vốn vận hành 240 triệu, cố định 72 triệu/tháng, còn 204/294 triệu sau 3 tháng, hòa vốn 120 triệu/tháng. Parent phân biệt tiền cọc có thể thu hồi với tiền mặt và nêu giả định chi phí còn thiếu. Không memory hoặc tri thức thừa. [Bằng chứng C03](qa-fix-c03-20260904-evidence.json).
- **UI chưa đạt:** có hai bản ghi cùng lời báo đã chuyển việc (`host-response`, sau đó `gateway-injected`) và khối “Replying to message” dù người dùng không tạo reply. Đã quan sát cả lúc chờ và khi mở Worked sau kết quả cuối. Đang truy nguyên tại nơi ghi transcript, không che bằng cách xóa bớt tin trên UI. Theo dõi riêng hậu tố chữ lạ trong tiêu đề và công thức LaTeX chưa render; không nhầm các lỗi trình bày với lỗi bàn giao.

## Cập nhật mới nhất — C02 sau khi được duyệt sửa xác thực, từ 22:06

- Đã dry-run rồi đổi **đúng một trường** `agents.entries.main.model`: giữ `openai/gpt-5.6-sol`, chỉ ghim sang profile OAuth công ty đang tồn tại `openai:it@comnieuthienly.vn`. Kiểm tra cấu hình ngoài trường này không thay đổi. Gateway PID 46563 tự hot reload lúc 22:06:50; không chạy build/restart/deploy, không thay quyền, publication hoặc index. Mục 21:59 bên dưới là bằng chứng lỗi **trước** thao tác đã duyệt.
- C02 được hỏi riêng bằng prompt tự nhiên trong chat `bebe71a6`, trên tab Chrome User đang đăng nhập. Run `5f314d7b-46ad-4a76-bc21-cc099447bbee`: **định tuyến, chứng cứ và nội dung đạt** — local, không xin phép Finance, 0 child; thực tế 3 search + 1 get, 0 memory/read/exec/delegate. Toàn bộ lượt model ghi nhận OpenAI GPT-5.6 Sol. Đáp án: dự kiến 7.560.000đ, hạn mức 7.080.000đ, vượt 480.000đ, hạn nộp 5 ngày làm việc; chi vượt cần CFO chấp thuận bằng văn bản trước khi phát sinh. Nguồn FIN-01 v1 được nêu rõ là QA. [Bằng chứng sau sửa xác thực](qa-fix-c02-auth-20260904-evidence.json).
- **UI chưa nghiệm thu:** trước/sau reload, một phần hoạt động được gom khác nhau vào mục Worked; không phải mất tool call. Chat riêng `88b927f9` dùng lại cùng prompt để mở disclosure kiểm tra, không chuyển sang case mới. Còn quan sát nhãn composer tạm hiện Luna/Off rồi về Sol/Medium, trong khi runtime thực tế vẫn Sol; đây là lỗi metadata hiển thị, chưa có bản sửa.
- Đã sửa cục bộ lỗi gom nhóm: block `thinking` trong bản lưu trước đây bị nhận là nội dung hiển thị, khiến tool activity không được thu gọn nhất quán. `message-normalizer.ts` loại block này khỏi nội dung nhìn thấy; phần suy luận vẫn có disclosure riêng lấy từ raw message. Bản sửa **chưa được build vào giao diện đang chạy**.
- Phạm vi review: branch `ver2`; invariant là cùng tool activity phải được gom nhất quán ở live/history mà không giấu ảnh/tệp hoặc thẻ công cụ. Owner là chuẩn hóa nội dung hiển thị, sibling là completed-work grouping và bubble disclosure. Không đổi API, storage, auth, quyền hay model. Đợt này sửa `ui/src/lib/chat/message-normalizer.ts` (5 thêm/8 bỏ, -3 dòng ròng; thu gọn cơ học object text để giữ giới hạn lint) và mở rộng regression hiện có trong `ui/src/pages/chat/chat-thread.test.ts`; không tính toàn bộ diff có sẵn của file test là thay đổi mới.
- Regression mới đỏ trước sửa với fixture persisted thinking, xanh sau sửa. Bộ UI unit gồm `chat-thread.test.ts`, `message-normalizer.test.ts`, `chat-message.test.ts`: **473/473 đạt**, 3 file. Đây là node/jsdom, không phải Chrome E2E hay Playwright. Chưa có bằng chứng UI live sau bản sửa và chưa chạy tiếp C03/C04.
- Lượt unit cuối lúc 22:20:09 vẫn 473/473 đạt; format hai file và `git diff --check` đạt. `node scripts/run-tsgo.mjs -p tsconfig.ui.json --noEmit` chưa đạt: 12 lỗi khóa trùng tại `ui/src/i18n/enterprise-user.ts` và một lỗi ép kiểu `ApplicationContext` tại `ui/src/pages/enterprise-admin/pages/models-page.ts`. Các vùng lỗi ngoài patch này, trang model giống HEAD; không sửa lẫn thay đổi giao diện khác.
- Gate cuối `.agents/skills/autoreview/scripts/autoreview --mode uncommitted` vẫn thoát 1 **trước khi gọi reviewer** do thiếu TruffleHog; chưa có findings để chấp nhận/từ chối, không có kết quả review sạch. Theo skill `autoreview`, không tự cài hoặc bỏ qua kiểm tra này. Không coi unit xanh là đủ điều kiện cập nhật giao diện live.
- Typed lint cuối hai file UI đạt với `node scripts/run-oxlint.mjs --tsconfig config/tsconfig/oxlint.core.json ui/src/lib/chat/message-normalizer.ts ui/src/pages/chat/chat-thread.test.ts`. Lượt dùng `tsconfig.ui.json` ban đầu bị dừng ở bước chuẩn bị artifact ngoài phạm vi; không dùng lượt dừng làm bằng chứng đạt và không chạy build giao diện/gateway.

## Cập nhật sau sửa — kiểm riêng C02 lúc 21:59 ngày 04/09

Đã gửi lại đúng câu hỏi công tác tự nhiên của C02 trong chat mới `ea0483b3` trên **chính tab Chrome User đang đăng nhập**. Thao tác qua kết nối tab của extension, không điều khiển cửa sổ/bàn phím macOS và không dùng Playwright hoặc profile mới. Tab Admin và các tab ngoài phạm vi không thay đổi. [Bằng chứng lần thử riêng](qa-fix-c02-20260904-evidence.json).

- **Định tuyến đạt cho lần thử này:** `local`, `router_no_candidate`, không xin đồng ý Finance, 0 selected/confirmed plan và 0 child.
- **C02 tổng thể chưa đạt:** trước khi parent gọi model, UI báo profile OpenAI được ghim không tồn tại. Có 0 tool call; chưa tới search/get và chưa có đáp án hạn mức/hạn chứng từ. Không dùng kết quả định tuyến để chấm cả case đạt.
- Đã dừng tại lỗi này, không gửi case tiếp theo. Fingerprint publication/quyền/tài khoản/router vẫn là `a11a3d464e14edcd36dacfe562fa1635ab3bd774b858ab1f5abec0aada1b446d`.

Nguyên nhân: đường chat trực tiếp trước đây không chuyển pin xác thực của model mặc định vào bước chọn auth nên có thể tự chọn profile khác; đường tiếp tục parent sau child lại giữ pin nghiêm ngặt. Pin cũ đã mất nên hai đường hành xử khác nhau. Bản sửa chuyển đúng pin ở bước tiếp nhận chat, giữ kiểm tra nghiêm ngặt; cấu hình sai nay bị chặn sớm, **không tự sửa được profile đang dùng**.

Đích vận hành cần duyệt: chỉ đổi `agents.entries.main.model` sang cùng `openai/gpt-5.6-sol` nhưng ghim profile OpenAI công ty còn hạn và đã ghi nhận chạy thành công. Phạm vi là native `main`, hiện một Personal đang bật kế thừa template này và các Personal kế thừa về sau; không đổi Finance/Contract/HR, credential, auth order hoặc quyền. Chưa thực hiện thay đổi cấu hình. Luồng hiện có là `config set` với `--strict-json --dry-run` trước khi apply; đường dẫn này hỗ trợ hot reload, không dự kiến cần restart thủ công.

### Phạm vi sửa và kiểm chứng kỹ thuật mới

- Branch `ver2`; giữ nguyên thay đổi dở dang khác. Phạm vi là owner định tuyến/plan và bước tiếp nhận lượt parent, không mở rộng public API, storage hay quyền. Ba file production được sửa: `delegation-router-model.ts`, `delegation-router.ts`, `get-reply-run-admission.ts`; ba file test tương ứng. Hai file router đã untracked trước đợt này, không coi toàn bộ nội dung của chúng là LOC mới; file admission tăng 18 dòng ròng.
- Model không được thấy HR `explicit_only` nếu chưa được gọi đích danh; plan có target/input/phạm vi không hợp lệ không được lưu hoặc phát lời xin đồng ý như hợp lệ. Hướng dẫn phân biệt tra chính sách cộng phép tính với phân tích chuyên môn, không hardcode dữ liệu QA.
- Router: **98/98** test trong 3 file đạt; regression mới đã có 5 lỗi trước sửa. Sau đó chỉ đổi cơ học `.sort()` sang `.toSorted()` trong một assertion để đáp ứng lint.
- Auth: **201** test được chọn trong 5 file đạt, 113 test ngoài bộ lọc bỏ qua; hai regression pin đã thất bại trước sửa. Test hợp đồng/mocked admission không thay cho bằng chứng parent resume thực tế; C03 chưa được kiểm lại.
- Core typecheck đạt. Typed lint 5 file đạt; file continuation còn hai lỗi nền `max-lines` và `no-map-spread`, chưa sửa ngoài phạm vi. `git diff --check` đạt. Không gộp các số này với 190 test ở pha thu bằng chứng cũ bên dưới.
- Gateway hiện có PID mới/buildstamp 21:54:14 và bundle chứa bản sửa; agent không chạy lệnh build/restart/kill. Kết quả Chrome mới xác nhận hành vi thực tế. Không gọi đây là bằng chứng từ một gateway QA cô lập.
- Gate `.agents/skills/autoreview/scripts/autoreview --mode uncommitted` thoát 1 trước khi gọi reviewer vì thiếu TruffleHog; chưa có finding hoặc kết quả review sạch. Không tự cài hoặc bỏ qua cổng kiểm tra bí mật. Bản sửa chưa được coi là sẵn sàng phát hành.

## Chiến lược mới: sửa từng case rồi kiểm lại riêng

Kế hoạch tiếp tục chạy hết A/B/C đã được thay bằng trình tự sau; kế hoạch và kết quả cũ được giữ nguyên làm bằng chứng, không xóa lỗi hoặc chạy lại để thay thế chúng:

1. Chốt bằng chứng case đang chưa đạt, xác định nguyên nhân và sửa tại nơi sở hữu luồng. Ưu tiên nhánh C02/C04 chọn sai hoặc mất kế hoạch bàn giao, đồng thời xử lý tính nhất quán xác thực khi parent tiếp tục sau child.
2. Kiểm tra kỹ thuật có mục tiêu cho phần sửa; không dùng test xanh để tự kết luận trải nghiệm đã đúng.
3. Thử lại **riêng case đó trong một session mới**, bằng prompt nghiệp vụ tự nhiên, không chỉ định công cụ, chuyên gia hoặc nguồn. Đối chiếu định tuyến, child thật, chứng cứ, đáp án cuối và UI.
4. Nếu case vẫn chưa đạt, giữ nguyên lần thất bại rồi tiếp tục sửa đúng nguyên nhân; chưa mở rộng sang chuỗi dài.
5. Chỉ sau khi case riêng đạt mới chạy kết hợp và nhiều lượt để kiểm tra giữ dữ kiện, sự đồng ý, chuyển việc và tổng hợp.

Giới hạn vận hành vẫn giữ nguyên: không tự restart/deploy gateway, đổi model/provider, mở quyền thật, sửa publication hoặc reindex. Việc áp dụng bản sửa vào môi trường đang dùng phải theo đúng quyền vận hành đã được duyệt; không dùng yêu cầu đổi chiến lược để suy ra quyền thay đổi môi trường.

## Phạm vi và cách đọc kết quả

Kiểm thử trên đúng Chrome User/Admin đang mở, gateway `127.0.0.1:18789`, tài khoản Hiếu DZ. Thiết kế ban đầu gồm ba lượt A/B/C với ba cách diễn đạt tự nhiên, mỗi lượt dự kiến 11 case trong cùng một hội thoại để kiểm tra giữ và gác ngữ cảnh. Thực tế A/B đã chạy hết danh sách; C dừng sau C02 theo chiến lược mới ở trên. Prompt không chỉ định công cụ, chuyên gia hoặc nơi tra cứu. Các dữ liệu nghiệp vụ đều là QA/hư cấu.

**C04 là tình huống kết hợp:** nhân viên hỏi có nên chốt đợt triển khai cho 30 người, ngân sách 60 triệu, dịch vụ 48 triệu chưa thuế; hợp đồng yêu cầu ứng 80%, thiếu hạn khắc phục và trần trách nhiệm 2 triệu. Câu trả lời cần kết hợp ngân sách, hợp đồng, truy cập dữ liệu, đào tạo và bàn giao. Nghiệm thu yêu cầu parent đọc nguồn và Finance/Contract thực sự hoàn thành phần được giao; parent tự trả lời không thay được bằng chứng này.

- [Kế hoạch chi tiết, oracle và từng prompt](qa-retest-20260904-plan.md).
- [Baseline trước sửa](qa-combined-agent-knowledge-20260904-results.md).
- [Rà soát A](qa-retest-20260904-A-independent-review.md), [rà soát B](qa-retest-20260904-B-independent-review.md).
- [Nguyên nhân runtime và kế hoạch sửa/tái kiểm](qa-retest-20260904-runtime-findings.md).

Không gộp thành một tỷ lệ đạt. Định tuyến, child thực tế, chứng cứ, nội dung và UI được chấm riêng. `done`, lời hứa giao việc hoặc một phép tính đúng không có nghĩa bàn giao đã hoàn tất. Mã phiên và run hash nối bằng chứng; audit tổng toàn tài khoản không được dùng làm số child của case.

## Môi trường và giới hạn vận hành

- Parent thực tế: OpenAI GPT-5.6 Sol, harness OpenClaw, Medium. Router: GPT-5.6 Luna, policy revision 2; account policy revision 4. Revision tài khoản khác baseline cũ, nên không coi môi trường hoàn toàn đồng nhất với lần cũ.
- Finance yêu cầu đồng ý; Contract auto khi đủ chắc chắn; HR chỉ được gọi đích danh. Không đổi các chế độ này.
- Sáu vùng QA đã publish, parent có quyền đọc; chuyên gia không có direct binding. Bảng quyền nhận trích đoạn tồn tại nhưng hiện có **0 grant**. Đây là thiếu điều kiện cho nhánh chuyển chứng cứ thành công, không tự động giải thích được lỗi xảy ra trước bước đó.
- Snapshot mang tên `environment-before` được chụp lúc 21:00:49, khi A đã bắt đầu, không phải trước tin nhắn đầu tiên. Fingerprint khi đó, sau A/B và khi chụp C partial đều là `a11a3d464e14edcd36dacfe562fa1635ab3bd774b858ab1f5abec0aada1b446d`.
- Không restart/deploy gateway, sửa publication, đổi model/provider, mở quyền thật hoặc sửa index. Đã khởi động Docker Desktop có sẵn vì sandbox ban đầu không kết nối được daemon; không tắt sandbox hoặc tải image thay thế. Docker được để chạy để phục vụ gateway.
- Trong pha thu bằng chứng A/B/C partial chỉ thêm/cập nhật artifact QA trong `output/`, không sửa product source. Công việc sửa source sau yêu cầu đổi chiến lược được theo dõi riêng, không áp ngược vào các kết quả trước sửa bên dưới.

## Phiên và bằng chứng

| Lượt                      | Session suffix | Bằng chứng                                                                                                                                             |
| ------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A                         | `ba0561c5`     | [Evidence A](qa-retest-20260904-A-evidence.json), [metrics A](qa-retest-20260904-A-metrics.json)                                                       |
| B                         | `c66f48cd`     | [Evidence B](qa-retest-20260904-B-evidence.json), [metrics B](qa-retest-20260904-B-metrics.json)                                                       |
| C — partial, dừng sau C02 | `0feb5fb4`     | [Evidence C partial](qa-retest-20260904-C-partial-evidence.json), [metrics C partial](qa-retest-20260904-C-partial-metrics.json); chỉ 2/11 case đã hỏi |

Hai lần không hợp lệ được giữ riêng, không dùng để thay thế hoặc làm xanh các case:

1. `5951cfde`: C01 đầu tiên lỗi vì Docker daemon chưa chạy; giữ lỗi hạ tầng này rồi tạo phiên A mới sau khi Docker sẵn sàng.
2. `e68f5eac`: nhập bằng bàn phím native làm mất ký tự tiếng Việt. Câu đã gửi không khớp prompt chuẩn, nên loại khỏi lượt C, không sửa tin đã gửi. [Evidence lỗi nhập](qa-retest-20260904-input-infrastructure-evidence.json). Phiên C chuẩn dùng paste và đối chiếu đầy đủ nội dung trước khi gửi.

Ở pha lịch sử sau B, kết nối điều khiển tab bị ngắt và đã tiếp tục bằng native UI trên cửa sổ/tab Chrome cũ. Sau yêu cầu không dùng native UI của người dùng, cách này đã dừng; lần thử riêng C02 sau sửa dùng kết nối Chrome extension như phần cập nhật trên. Không tác động các tab ngoài phạm vi.

## Kết quả lượt A

11 case, 16 tin người dùng, 5 lời bổ sung; 17 search, 11 get, 0 memory và **0 child**. Hai plan selected thuộc C04/C08; không có plan confirmed.

| Case | Định tuyến / child                                                         | Chứng cứ và nội dung                                                                                                          | UI / kết thúc                                               |
| ---- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| C01  | Đạt: parent trực tiếp, không tool/child                                    | Đúng 378.000đ                                                                                                                 | Có đáp án cuối                                              |
| C02  | Không đạt: hỏi giao Finance thừa; đồng ý xong không có child               | Parent 2 search/1 get; đúng 7,08 triệu, vượt 480 nghìn, hạn 5 ngày làm việc                                                   | Có đáp án nhưng lời bàn giao không được thực hiện           |
| C03  | Không đạt: một lời đồng ý, không Finance child                             | Parent tự tính đúng 204/294 triệu, hòa vốn 120 triệu                                                                          | Không hoàn tất bàn giao                                     |
| C04  | Không đạt: 4 câu xin phép/3 lời đồng ý; từng nêu HR dù không gọi đích danh | Không search/get/child; không có phân tích nghiệp vụ. Không hỏi lại mã trong A                                                | Dừng case tại câu xin phép thứ tư; không giả làm thành công |
| C05  | Không có kết quả C04 hoàn tất để tóm tắt; parent tự bổ sung tra cứu        | Đúng 5 việc, không memory/lệnh quản trị; nhưng deadline đăng ký trước 07/09 không bảo đảm đủ 9 ngày làm việc cho lớp 14–15/09 | Có đáp án; tiền điều kiện và lỗi lịch ghi riêng             |
| C06  | Đạt: không bị từ khóa kéo sang điều phối                                   | Chỉ dịch tiêu đề                                                                                                              | Có đáp án cuối                                              |
| C07  | Đạt: tra cứu, không HR child                                               | Nói rõ chưa có mức trợ cấp/hạn nộp; không bịa                                                                                 | Có đáp án cuối                                              |
| C08  | Đạt bước làm rõ                                                            | Hỏi mã hợp đồng mới, không dùng BT-0904                                                                                       | Chờ đầu vào đúng dự kiến                                    |
| C09  | Đạt chuyển việc; không hồi sinh hợp đồng                                   | Đúng 35/31 ngày, không bảo đảm khôi phục; có chữ lạ “dữ liệuANDA QA” và dấu hiệu citation biến dạng                           | Nội dung chính đạt; link nguồn cần kiểm thêm                |
| C10  | Đạt parent dùng nguồn, không HR child                                      | Đúng HR-01 v2, thiết bị/MFA/buddy/tuần đầu/remote; không bịa ngoại lệ                                                         | Có đáp án cuối                                              |
| C11  | Đạt                                                                        | Đúng 16/20, học bổ sung, thi lại sau 2 ngày làm việc, quản lý trực tiếp xác nhận                                              | Sau reload vẫn còn đáp án và thẻ nguồn, trạng thái idle     |

Lỗi lịch A-C05 là deadline không bảo đảm điều kiện, không phải khẳng định người dùng đã đăng ký vào một ngày cụ thể. Ví dụ nộp ngày 04/09 vẫn thỏa “trước 07/09”, nhưng chưa đủ 9 ngày làm việc trước 14–15/09 theo lịch thứ Hai–thứ Sáu, kể cả đếm cả hai đầu. Không tự sửa nguồn hoặc chốt một deadline thay thế khi chưa có lịch làm việc được xác nhận.

## Kết quả lượt B

11 case, 14 tin người dùng, 3 lời bổ sung; 3 completion nội bộ không được đếm thành tin người dùng. 14 search, 14 get, 1 lần liệt kê chuyên gia, 0 memory ở parent. Có **1 Finance child của C03**, không có child C04.

| Case | Định tuyến / child                                                                    | Chứng cứ và nội dung                                                                                                              | UI / kết thúc                                                                     |
| ---- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| C01  | Đạt: parent trực tiếp                                                                 | Đúng 378.000đ                                                                                                                     | Có đáp án cuối                                                                    |
| C02  | Không đạt: hybrid Finance cho bài toán đơn giản; plan đã confirmed nhưng không child  | Preparer trả selection rỗng; chưa tới kiểm tra quyền chuyển. Không trả được hạn mức/hạn hồ sơ                                     | Báo chưa khởi chạy được, không giả thành công                                     |
| C03  | Đúng 1 Finance child nhận đủ số liệu, chạy xong; không hoàn tất trả kết quả về parent | Child trả đúng 204/294/120; harness Codex, Luna. Delivery lỗi auth profile của parent; completion còn cắt trước các kết quả chính | Hai thông báo chờ giống nhau và banner lỗi đã thấy trên ảnh; không có đáp án cuối |
| C04  | Không đạt: sau 1 lời đồng ý parent tự làm; không có Finance/Contract child mới        | Parent lấy đúng 7 nguồn; giữ ngày 18/09 và bảo hành 60 ngày/phạm vi cấu hình. Thiếu yêu cầu MFA trong thân đáp án                 | Có bản phân tích nhưng không nói rõ phần chuyên gia chưa hoàn tất                 |
| C05  | Đạt phần tóm tắt nội dung hiện có; không thay điểm bàn giao C04                       | Đúng 5 việc, không tool/memory, nêu cần xác nhận                                                                                  | Có đáp án cuối                                                                    |
| C06  | Đạt: chỉ dịch                                                                         | Budget & Contract Risk Analysis                                                                                                   | Có đáp án cuối                                                                    |
| C07  | Đạt: không HR child                                                                   | Không bịa trợ cấp/hạn nộp                                                                                                         | Có đáp án cuối                                                                    |
| C08  | Đạt bước làm rõ                                                                       | Hỏi mã hợp đồng mới                                                                                                               | Chờ đầu vào đúng dự kiến                                                          |
| C09  | Đạt chuyển việc                                                                       | Đúng 35/31 ngày và giới hạn dữ liệu QA/khôi phục thật                                                                             | Có đáp án cuối                                                                    |
| C10  | Đạt định tuyến, nội dung chưa đầy đủ                                                  | Đúng nguồn mới, 2 ngày remote/tuần và hạn 16:00, không bịa ngoại lệ; bỏ điều kiện không áp dụng ca trực quầy dù đã đọc HR-02      | Có đáp án cuối                                                                    |
| C11  | Đạt                                                                                   | Đủ chương trình 9 ngày, 16/20, học bổ sung/thi lại sau 2 ngày làm việc, quản lý xác nhận; phân biệt buddy 30 ngày                 | Reload giữ đáp án/thẻ search-get và trở lại Sol/Medium, idle                      |

## Kết quả lượt C — partial, không chạy tiếp C03–C11

Snapshot read-only lúc 21:50:46 UTC+7, session `0feb5fb4-214e-4540-8463-4a0c748cd79c`. Có 2 prompt mở đầu khớp kế hoạch, 3 tin người dùng gồm một lời đồng ý; 3 sự kiện role=user nội bộ không tính thành lời người dùng. Có 4 routing event, 1 selected plan, 1 confirmed plan và 1 Finance child. Parent không có search/get/memory trong hai case này.

| Case    | Quan sát                                                                                                                                                                                                                                                                                                                                                | Trạng thái                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| C01     | Tính trực tiếp đúng 378.000đ, không tool hoặc child                                                                                                                                                                                                                                                                                                     | Đạt phạm vi case                                                   |
| C02     | Xin Finance → một lời đồng ý → child thật `90015388-ac38-497d-a679-21fef1ed8591` chạy và registry kết thúc `ok`. Child tính được 7,56 triệu nhưng không có hạn mức/hạn chứng từ; có 2 memory_search, 1 sandbox_exec, 2 read, không có công cụ tri thức được gọi trong child. Parent lưu hai thông báo chờ giống nhau, chưa có đáp án nghiệp vụ tổng hợp | Không đạt định tuyến cho câu đơn giản và chưa hoàn tất câu trả lời |
| C03–C11 | Không gửi prompt, không chạy                                                                                                                                                                                                                                                                                                                            | **Chưa kiểm thử trong lượt C**, không chấm thành đạt hoặc lỗi      |

Router C02 còn ghi `mutation_confirmation_expired`; mã này không tự chứng minh người dùng để hết thời gian phê duyệt hoặc giải thích toàn bộ lỗi tiếp tục parent. Child `ok` chỉ là trạng thái thực thi, không có nghĩa đã trả được chính sách hoặc parent đã tổng hợp xong. Không dùng child C02 của C để cộng cho C03/C04 chưa chạy.

Lần nhập mất dấu ở `e68f5eac` tiếp tục được giữ riêng và loại khỏi C chuẩn. Không khởi chạy thêm case sau khi người dùng yêu cầu dừng chuỗi; các lần thử sau sửa sẽ có session/artifact riêng.

## Kiểm thử kỹ thuật ở pha thu bằng chứng trước sửa

**190 test thực sự chạy đạt, trong 15 file.** Không tính các test của đợt triển khai trước vào con số này.

1. Router + continuation + durable execution/backend: 5 file, 100 test đạt.
2. Store/API quyền chứng cứ, execution/evidence/preparation, delegation tools: 6 file, 30 test đạt. Lệnh còn yêu cầu `system-prompt.memory.test.ts` nhưng runner không chọn file đó; shard `unit-fast` báo không có test. **Không tính memory suite là đã retest.**
3. UI tool cards, outcome, knowledge card và Admin knowledge: 4 file, 60 test đạt bằng `ui/vitest.config.ts` với alias workspace sẵn có.

Lần gọi UI bằng `vitest.node.config.ts` trước đó lỗi import `@openclaw/normalization-core`, chưa chạy test nào. Dùng cấu hình UI chuẩn đã có giải quyết việc phân giải package; không cài package, không sửa source để làm xanh.

Các lệnh đã dùng:

```sh
node scripts/run-vitest.mjs src/enterprise/delegation/delegation-router.test.ts src/enterprise/delegation/delegation-router-ai.test.ts src/enterprise/delegation/delegation-router-continuation.test.ts src/agents/embedded-agent-runner/run/enterprise-delegation.durable.integration.test.ts src/agents/embedded-agent-runner/run/backend.enterprise-delegation.test.ts
node scripts/run-vitest.mjs src/enterprise/knowledge/knowledge-evidence-transfer-store.test.ts src/enterprise/knowledge/enterprise-knowledge-http.test.ts src/agents/enterprise-delegation-execution.test.ts src/agents/enterprise-delegation-evidence.test.ts src/agents/embedded-agent-runner/run/enterprise-evidence-preparation.test.ts src/agents/tools/enterprise-delegation-tools.test.ts src/agents/system-prompt.memory.test.ts
# cwd: ui
node ../node_modules/vitest/vitest.mjs run --config vitest.config.ts src/pages/chat/components/chat-tool-cards.node.test.ts src/pages/chat/components/chat-tool-cards.outcome.test.ts src/pages/chat/components/chat-knowledge-card.test.ts src/pages/enterprise-admin/pages/knowledge-page.test.ts
```

Node thực thi: `/Users/hieunguyenduc/.nvm/versions/node/v26.8.1/bin/node`. Không chạy lại build/typecheck toàn repo trong đợt chỉ retest này. Không có test process còn chạy sau khi nhận kết quả các lệnh trên.

## Những phần chưa có bằng chứng nghiệm thu

- Chuyển chứng cứ thành công, thu hồi quyền sau get, publication đổi, local_only và dữ liệu thực sự tới model trên cả hai runtime: chưa được xác nhận bằng các lượt Chrome này. Không có grant và chưa có child nhận gói chứng cứ được kiểm chứng.
- Không lấy việc parent đã get làm bằng chứng chuyên gia đã nhận. Preparer private không lưu nội dung dài hạn; thiếu telemetry an toàn khiến chưa phân biệt được nguyên nhân selection rỗng ở B-C02.
- Test kỹ thuật đạt không chứng minh mọi model tự chọn đúng đường trong prompt tự nhiên; các lỗi A/B/C là bằng chứng phản ví dụ thực tế.
- Nhánh `skipped` và lỗi truy xuất thật sau reload chưa được đối chiếu thành một cặp trên gateway live. Các thẻ truy xuất thành công còn sau reload không thay được kiểm tra này.
- Index Personal/Finance chưa được sửa hoặc reindex; đó là bước vận hành riêng. Không suy từ parent không gọi memory thành mọi index đã khỏe.
- Chưa thử fault injection live như restart gateway, thu hồi quyền giữa lượt, đổi provider hoặc cố tình làm lỗi một trong hai child. Không thực hiện các thao tác đó trên môi trường đang dùng để hoàn thành bảng điểm.
- Ảnh UI đã được xem trong quá trình thao tác; không có file screenshot cục bộ được lưu, nên không tạo đường dẫn ảnh giả.

## Phạm vi sửa đã phát hiện — thực hiện và nghiệm thu từng case

Danh sách dưới đây là các nhóm cần xử lý, không phải yêu cầu tiếp tục chạy hết lượt C. Mỗi nhóm phải đi theo chiến lược sửa → thử riêng bằng prompt tự nhiên → đạt rồi mới kiểm kết hợp ở đầu báo cáo.

1. Sửa tính nhất quán của plan/xin phép: plan invalid không được phát lời xin bàn giao như đã hợp lệ; loại target HR không được gọi trước khi đóng plan; đồng ý phải nối đúng plan và đầu vào đã biết.
2. Chặn định tuyến thừa ở câu chính sách cộng phép tính đơn giản. Kiểm lại ba prompt C02 tự nhiên, không thêm chỉ dẫn công cụ vào prompt.
3. Chẩn đoán và sửa đúng pinned auth profile khi resume parent, giữ nguyên model/provider/quyền. Test phải chứng minh child hoàn thành → parent nhận đủ kết quả → có đáp án cuối, kể cả retry.
4. Khắc phục truncation completion: không để các kết quả quan trọng ở cuối bị mất khỏi ngữ cảnh tổng hợp; kiểm bằng dữ liệu thực sự tới lần gọi model, không chỉ chuỗi prompt mock.
5. Thêm telemetry riêng tư-an toàn cho chuẩn bị chứng cứ: phase, run/assignment hash, số lượt, mã lỗi; không log trích đoạn, citation token hoặc đường dẫn riêng tư. Kiểm search/get/selection/grant thành các bước riêng.
6. Sửa tổng hợp điều kiện nguồn: kiểm thời gian đăng ký trước đào tạo, MFA, ca trực quầy; giữ khác biệt giữa quy định, tính toán và đề xuất.
7. Thực hiện sửa index/quyền chuyển và áp dụng bản sửa ở đúng đích sau khi được duyệt vận hành; sau đó chạy lại bộ tự nhiên và nhánh thu hồi/quyền/egress trên gateway QA riêng trước smoke bằng Chrome hiện có.

Không tự mở grant, đổi auth hoặc restart gateway để vượt qua các chặn trên. Hoàn tất đợt kiểm thử không đồng nghĩa hệ thống đã đạt nghiệm thu.
