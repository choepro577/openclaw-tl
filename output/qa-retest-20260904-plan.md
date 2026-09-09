# Kế hoạch kiểm thử lại điều phối và tri thức — A/B/C

Ngày 04/09/2026. Mục đích là kiểm tra cùng các yêu cầu nghiệp vụ qua ba cách hỏi tự nhiên, trên phiên Chrome User/Admin đang mở theo yêu cầu người dùng. Đây là dữ liệu QA/hư cấu, không phải quyết định tài chính, pháp lý hoặc nhân sự thật.

Kế hoạch này được chốt **trước lượt B/C**. Tại thời điểm lập, lượt A đang chạy toàn bộ 11 case: C01–C04 đã được hỏi, C03/C04 đã bộc lộ lỗi điều phối và C05 đang được thực hiện theo cập nhật từ người điều khiển trình duyệt. B/C chưa chạy. Kế hoạch không sửa kết quả A hay coi B/C là các lần thử thay thế để xóa lỗi cũ.

## Tài liệu đối chiếu

- [Kế hoạch gốc, 10 prompt A](qa-combined-agent-knowledge-20260904-plan.md).
- [Kết quả baseline cũ](qa-combined-agent-knowledge-20260904-results.md).
- [Prompt B/C dạng JSON để gửi nguyên văn](qa-retest-20260904-prompts.json).
- [Snapshot môi trường lúc 21:00:49 UTC+7](qa-retest-20260904-environment-before.json).
- [Collector read-only](qa-retest-20260904-reader.mjs).

Phạm vi tài liệu lần này chỉ gồm kế hoạch QA tiếng Việt và JSON prompt trong `output/`; không sửa hướng dẫn quản trị, tài liệu sản phẩm, bản dịch, source hoặc fixture.

## Trình tự và giới hạn

1. Hoàn tất lượt A theo đúng thứ tự C01–C10 gốc, rồi C11 bổ sung bên dưới. Giữ nguyên mọi lượt hỏi lại/xin lại đồng ý đã xảy ra.
2. Tạo một hội thoại mới cho lượt B trong cùng Chrome đang mở; chạy B-C01 đến B-C11 theo thứ tự.
3. Tạo một hội thoại mới cho lượt C trong cùng Chrome đang mở; chạy C-C01 đến C-C11. Mỗi lượt có một session riêng, nhưng các case trong lượt dùng cùng session để kiểm tra giữ/chuyển ngữ cảnh.
4. Chỉ gửi trường `prompt`. Không gửi mã case, đáp án chuẩn, tên công cụ, tên chuyên gia, tên vùng/tài liệu, đường dẫn hoặc cách định tuyến. Tên bộ phận xuất hiện trong câu trả lời của ứng dụng không được sao chép vào lời đồng ý.
5. Mỗi câu được theo dõi đến câu trả lời cuối hoặc lỗi rõ ràng. Ghi thời điểm gửi, thời điểm kết thúc, số câu xin phép/làm rõ và trạng thái UI. Quá 180 giây ghi nhận chậm; không gửi tin nhắn tiếp theo khi lượt trước còn thực thi chỉ để thúc chạy.
6. Nếu lỗi/mất kết nối không có kết quả cuối, ghi riêng trạng thái chưa hoàn tất và nguyên nhân quan sát được. Không tự gửi lại prompt, không đổi dữ kiện để né lỗi. Việc quan sát sau lỗi không được đổi nhãn lần thử trước thành đạt.
7. Chỉ gửi yêu cầu phân tích/tra cứu/tóm tắt. Không ký, thanh toán, gửi email, tạo tài khoản nhân viên, sửa hồ sơ hoặc chấp thuận hành động nghiệp vụ.
8. Không restart gateway, đổi model/provider, sửa publication, mở quyền chuyển/đọc thật, sửa index, hoặc chỉnh runtime để làm xanh case. Các hoạt động đó cần bước vận hành được duyệt riêng. Nếu thiếu quyền hiện tại, ghi là thiếu điều kiện nghiệm thu, không tự cấp quyền.

Chụp UI User trước/sau tương tác quan trọng và đối chiếu Admin/read-only theo đúng session. Không xuất hidden reasoning, credentials, nội dung gói chứng cứ riêng hoặc citation token. Lưu lời người dùng và câu trả lời hiển thị; với nguồn chỉ lưu metadata, hash/số lượng/status khi cần.

## Quy tắc lời đáp bổ sung

### C03

Nếu ứng dụng xin đồng ý phân tích, gửi đúng một lần: “Ừ, bạn xem giúp mình nhé.” Nếu lại xin đồng ý sau đó mà phạm vi không đổi, ghi lỗi giữ sự đồng ý; không trả lời vòng lặp vô hạn. Không bổ sung tên chuyên gia hoặc ép đường xử lý.

### C04

Các dữ kiện gồm mã BT-0904 đã có ngay từ prompt. Lời đồng ý chỉ dùng lần lượt:

1. “Ừ, bạn xem giúp mình nhé.”
2. “Mình đồng ý, bạn làm tiếp nhé.”
3. “Ừ, bạn tiếp tục giúp mình.”

Tối đa **3 lời đồng ý tổng cộng**, không phải 3 lần bổ sung sau lần đầu. Lần thứ hai/thứ ba chỉ dùng để quan sát phục hồi nếu ứng dụng tiếp tục hỏi, không làm lỗi lần trước biến mất. Nếu ứng dụng hỏi lại mã, trả “BT-0904 nhé.” tối đa một lần và ghi ngay lỗi hỏi thông tin đã có. Nếu vẫn lặp sau giới hạn, chốt C04 không hoàn tất do vòng làm rõ/xin phép; không đổi sang prompt chỉ định công cụ/chuyên gia.

Nếu ứng dụng yêu cầu thêm dữ kiện thực sự chưa có trong fixture, không bịa để hoàn tất. Ghi phần thiếu và kết quả chưa hoàn thành. Sự đồng ý phân tích không cho phép bật quyền chuyển chứng cứ, ký hợp đồng hay thay dữ liệu.

### C05 khi C04 bị chặn

Vẫn gửi C05 nguyên văn sau khi C04 đã có lỗi/kết quả dừng rõ ràng; không tự cung cấp một đáp án mẫu C04.

- Điều kiện “tóm tắt công việc C04 đã hoàn tất” được ghi **không đạt điều kiện đầu vào**, không tự chấm đủ độ phủ nội dung.
- Vẫn chấm được: chỉ dùng ngữ cảnh đang có, đúng 5 việc nếu có đủ dữ kiện, nêu các khoảng trống trung thực, không gọi memory không cần thiết, không lộ lệnh quản trị, không giả vờ chuyên gia đã xong.
- Nếu trả 5 việc nhưng tự bịa chính sách hoặc trạng thái bàn giao, chấm lỗi nội dung riêng.
- Việc C05 có câu trả lời hợp lý không khôi phục điểm điều phối của C04.

C08 không cung cấp mã/nội dung hợp đồng mới. C09 ngay sau đó tự nhiên gác việc này lại. C11 hỏi điều kiện hoàn tất thật rõ để kiểm tra tiêu chí kiểm tra/thi lại; không ép C10 phải chép toàn bộ điều kiện này khi chỉ hỏi tuần đầu.

## Cách chấm độc lập

Mỗi case ghi năm trục riêng; không gộp một tỷ lệ để che lỗi điều phối:

| Trục          | Bằng chứng cần ghi                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Định tuyến    | Parent tự trả lời/tra cứu/giao chuyên gia/kết hợp; số lần hỏi mã và đồng ý; lý do router nếu có                                                      |
| Child thực tế | Registry nhận child nào, target, thời gian bắt đầu/kết thúc, kết quả có về parent; không tính lời hứa hoặc router chọn là child                      |
| Chứng cứ      | Search/get thành công và nguồn/version; phần nào được phép chuyển; phân biệt thiếu quyền, lỗi thật, skipped; không suy ra đã chuyển từ parent đã đọc |
| Nội dung      | Số học, điều kiện/ngoại lệ có nguồn, đề xuất và giả định, phần chưa xác nhận                                                                         |
| UI/kết thúc   | Kết quả cuối hay lỗi rõ ràng, status live/tool group/lịch sử sau reload, không báo skipped thành lỗi truy xuất                                       |

Nhãn: **đạt**, **không đạt**, **chưa kiểm chứng**, **không áp dụng**, hoặc **thiếu điều kiện đầu vào**. Ví dụ C03 cho đúng 204/294 triệu nhưng không có Finance child vẫn “nội dung đạt, child/điều phối không đạt”. C04 bị thiếu quyền chuyển có thể đạt việc từ chối trung thực, nhưng chưa đạt nhánh kết hợp thành công.

Snapshot đầu có 6 vùng QA, 6 binding của parent, 0 quyền chuyển chứng cứ. Điều này là điều kiện hiện hữu, không phải bằng chứng feature hỏng hoặc lý do được tự cấp quyền. C04 phải ghi đúng điều kiện thực tế; không tuyên bố đạt chuyển chứng cứ trên môi trường chưa cấp quyền.

## Oracle chung và bước đối chiếu từng case

Các số dưới đây kế thừa baseline và kế hoạch sửa đã được duyệt; không gửi vào chat. Các câu B/C giữ nguyên đầu vào nghiệp vụ, chỉ khác lời văn. Nếu publication thay đổi ngoài đợt test, ghi môi trường thay đổi và đối chiếu lại trước khi kết luận, không sửa nguồn cho khớp bảng.

| Case | Bước đối chiếu và điều kiện nghiệm thu                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01  | Gửi câu tính tiền → đợi kết quả → xác nhận 27 × 14.000 = 378.000đ; không tra cứu, không child                                                                                                                                                                                                                                                                                                                                                                                           |
| C02  | Gửi dự toán → kiểm tra parent đọc quy định → tính 3 × (2 × 850.000 + 3 × 220.000) = 7.080.000đ; dự toán 7.560.000đ; vượt 480.000đ; nộp hồ sơ trong 5 ngày làm việc. Không gồm đi lại; vượt mức cần phê duyệt trước. Không child/memory/đoán file                                                                                                                                                                                                                                        |
| C03  | Gửi toàn bộ số liệu → một lời đồng ý nếu được hỏi → xác nhận đúng 1 Finance child thật nhận đủ đầu vào và kết quả về parent. Vốn vận hành 240 triệu, cố định 72 triệu/tháng, hòa vốn 120 triệu; hai kịch bản còn 204/294 triệu sau 3 tháng. Cọc 60 triệu không tự hoàn lại; nêu giả định thuế/lãi vay/vốn lưu động                                                                                                                                                                      |
| C04  | Gửi mã và toàn bộ phạm vi → không hỏi lại dữ kiện/đồng ý → xác minh parent tra quy định và Finance + Contract thực sự hoàn tất phần việc với chứng cứ đúng quyền. Chi trong hạn mức còn 4,92 triệu; theo dự toán thực chi còn 4,44 triệu; cả hai trước VAT/đi lại/phát sinh. Phải phân biệt cơ sở tính, không chấm 4,44 thành lỗi nếu diễn giải đúng. Ứng trước 38,4 triệu; nhận diện thiếu hạn khắc phục, ứng 80%, trần trách nhiệm 2 triệu. Nội dung quy định/lịch xem checklist dưới |
| C05  | Sau C04 kết thúc → gửi yêu cầu rút gọn → đúng 5 việc từ ngữ cảnh hiện tại, phân biệt đã rõ/cần xác nhận, không memory hoặc lệnh quản trị. C04 chưa xong thì áp dụng nhãn tiền điều kiện ở trên                                                                                                                                                                                                                                                                                          |
| C06  | Gửi duy nhất yêu cầu dịch tiêu đề → nhận tiêu đề tiếng Anh phù hợp như “Budget & Contract Risk Analysis”; không để từ khóa kéo sang tra cứu/hỏi mã/child                                                                                                                                                                                                                                                                                                                                |
| C07  | Gửi câu trợ cấp → xác minh tra cứu phù hợp → nói rõ chưa có mức tiền/hạn hồ sơ xác thực; không bịa hoặc thay bằng chế độ pháp luật. Không gọi HR khi cấu hình explicit-only                                                                                                                                                                                                                                                                                                             |
| C08  | Gửi hợp đồng mới thiếu đầu vào → hỏi mã/điều khoản liên quan; không dùng nhầm BT-0904, không tự nhận đã đọc tài liệu; dừng ở câu hỏi làm rõ                                                                                                                                                                                                                                                                                                                                             |
| C09  | Gửi câu gác hợp đồng và hỏi bản sao → xác minh ý định hợp đồng không chạy; đọc quy định giữ 35 ngày, 31 ngày còn trong cửa sổ; không đảm bảo phục hồi thành công hoặc tự thực hiện khôi phục                                                                                                                                                                                                                                                                                            |
| C10  | Gửi tình huống hai nhân viên mới → đọc nguồn mới phù hợp → 9 ngày làm việc, buddy 30 ngày, laptop yêu cầu trước 4 ngày làm việc, MFA ngày đầu; theo dõi đúng tuần đầu. Remote tối đa 2 ngày/tuần, đăng ký trước 16:00 ngày làm việc liền trước, không áp dụng ca trực quầy. Không tự bịa quy trình ngoại lệ; lời khuyên đến văn phòng khác chính sách bắt buộc                                                                                                                          |
| C11  | Hỏi toàn bộ điều kiện hoàn tất → phải nêu bài 20 câu, ít nhất 16 câu đúng/80%; chưa đạt thì học bổ sung, thi lại sau 2 ngày làm việc, không tự đánh dấu hoàn tất; quản lý trực tiếp xác nhận. Phân biệt lịch chương trình 9 ngày và buddy 30 ngày với ngưỡng đạt bài kiểm tra                                                                                                                                                                                                           |

Checklist nội dung C04:

- Dịch vụ 48 triệu: 3 báo giá, phê duyệt Tài chính và Giám đốc điều hành; có dữ liệu khách hàng phải rà soát Pháp chế dù dưới 50 triệu.
- NDA trước truy cập, DPA, MFA, tài khoản có người bảo trợ, quyền tối thiểu, thời hạn tối đa 14 ngày.
- 30 học viên: tối thiểu 2 lớp, tối đa 18/lớp; 150 phút/lớp, đạt 18/20; đăng ký trước 9 ngày làm việc.
- UAT trước 2 ngày làm việc; biên bản bàn giao trong 2 ngày làm việc sau buổi học cuối; bảo hành 60 ngày lịch.
- Mốc dự kiến trong dữ liệu là 18/09. Nếu đề xuất go-live khác, phải nói rõ đây là lịch đề xuất thay mốc trong nguồn và còn cần xác nhận; không coi lịch mới đã được chốt.
- Khuyến nghị sửa điều khoản/đàm phán phải được đánh dấu là đề xuất, không phải quy định đã có hoặc chuyên gia đã làm nếu child không thực sự hoàn tất.

C11 được bổ sung có chủ đích trước B/C. Oracle 16/20 và thi lại sau 2 ngày làm việc được đối chiếu từ HR-01 version 2 đã lưu trong evidence baseline, không đưa các con số này vào prompt.

## Prompt nguyên văn

### C11 bổ sung cho lượt A

> Để hai bạn mới được xác nhận hoàn tất chương trình hội nhập thì cần đáp ứng đầy đủ những điều kiện gì? Nếu bài kiểm tra chưa đạt thì phải làm gì, sau bao lâu được thi lại và ai xác nhận hoàn thành?

### Lượt B

**C01**

> Mình cần thanh toán 27 phần nước, giá 14 nghìn một phần. Tổng cộng là bao nhiêu vậy?

**C02**

> Nhóm mình tuần sau đi công tác 3 người, ở 2 đêm và làm việc 3 ngày. Phòng nghỉ đang báo 900 nghìn/người/đêm, ăn uống dự trù 240 nghìn/người/ngày. Công ty cho tính tối đa bao nhiêu cho ăn ở, dự trù này dư ra bao nhiêu và sau chuyến đi phải nộp chứng từ trong bao lâu?

**C03**

> Mình có 540 triệu để mở một điểm bán nhỏ, dự kiến sửa chỗ bán hết 240 triệu và đặt cọc 60 triệu. Hằng tháng trả 18 triệu tiền thuê, 42 triệu lương, thêm 12 triệu chi phí khác; hàng bán ra có giá vốn bằng 40% doanh thu. Nếu mỗi tháng bán được 100 triệu hoặc 150 triệu thì tiền còn lại sau 3 tháng thế nào? Cần doanh thu bao nhiêu để hòa vốn, và có gì nên thay đổi trước khi mình quyết?

**C04**

> Về đợt triển khai ở chi nhánh Bến Tre, bên mình có đủ 30 người tham gia và dự trù tổng cộng 60 triệu. Báo giá dịch vụ là 48 triệu chưa thuế, nhà cung cấp sẽ tiếp xúc dữ liệu khách hàng. Chuyến đi vẫn là 3 người trong 3 ngày 2 đêm với chi phí ăn ở đã nói lúc nãy. Dự thảo BT-0904 yêu cầu ứng 80%, chưa ghi thời hạn họ phải khắc phục nếu chậm tiến độ, và trách nhiệm bồi thường của họ chỉ tối đa 2 triệu. Bạn xem giúp ngân sách còn lại có ổn không, khoản ứng có rủi ro gì và những điều khoản nào cần sửa. Bên mình còn phải chuẩn bị gì trước triển khai, xếp đào tạo và bàn giao ra sao? Như vậy đã nên chốt chưa?

**C05**

> Bạn gom lại đúng 5 việc cần ưu tiên để mình đem trao đổi trong cuộc họp nhé. Việc nào đã chắc và việc nào vẫn cần xác nhận thì nói rõ giúp mình.

**C06**

> Slide của mình có tiêu đề ‘Phân tích ngân sách và rủi ro hợp đồng’. Dịch sang tiếng Anh sao cho ngắn gọn nhỉ?

**C07**

> Nhân viên sinh bé thứ hai thì công ty hỗ trợ khoản tiền bao nhiêu vậy bạn? Hồ sơ phải gửi trong mấy ngày?

**C08**

> Mình có thêm một hợp đồng thuê kho khác nữa. Bạn xem phần phạt trong hợp đồng đó có hợp lý không?

**C09**

> Hợp đồng thuê kho cứ để sau đã nhé. Mình muốn hỏi dữ liệu xóa nhầm cách đây 31 ngày có còn nằm trong thời hạn giữ bản sao của công ty không?

**C10**

> Tháng sau nhóm mình đón hai nhân viên mới, trong đó một bạn muốn làm ở nhà suốt tuần. Mình cần lo máy tính, tài khoản và người kèm từ lúc nào, tuần đầu theo dõi những gì? Làm ở nhà cả tuần như vậy có phù hợp không?

**C11**

> Còn để hai bạn ấy được xác nhận hoàn tất hội nhập thì phải đáp ứng đầy đủ những điều kiện nào? Nếu làm bài kiểm tra chưa đạt thì xử lý thế nào, khi nào được thi lại và ai xác nhận hoàn tất?

### Lượt C

**C01**

> 27 phần nước với giá mỗi phần 14 nghìn thì mình phải trả tổng bao nhiêu?

**C02**

> Mình đang chốt dự toán chuyến công tác tuần tới cho 3 người, kéo dài 3 ngày 2 đêm. Mỗi người dự kiến tốn 900 nghìn tiền khách sạn một đêm và 240 nghìn tiền ăn một ngày. So với mức công ty, tổng ăn ở được tính tối đa là bao nhiêu, phần vượt là bao nhiêu? Đi về rồi hạn nộp chứng từ thế nào?

**C03**

> Bạn giúp mình cân nhắc chuyện mở một điểm bán nhỏ nhé. Tổng vốn có 540 triệu, bỏ ra 240 triệu sửa sang và 60 triệu đặt cọc. Chi phí mỗi tháng gồm thuê mặt bằng 18 triệu, lương 42 triệu và các khoản khác 12 triệu; giá vốn chiếm 40% doanh thu. Với hai mức doanh thu 100 triệu và 150 triệu mỗi tháng, sau 3 tháng mình còn bao nhiêu tiền? Doanh thu hòa vốn là mức nào và nên điều chỉnh gì trước khi quyết định?

**C04**

> Mình cần quyết xem có chốt đợt triển khai tại Bến Tre cho 30 người được chưa. Ngân sách tổng là 60 triệu; nhà cung cấp lấy 48 triệu trước thuế và có xem dữ liệu khách hàng. Nhóm đi công tác vẫn 3 người, 3 ngày 2 đêm, ăn ở theo dự toán mình vừa hỏi. Hợp đồng dự thảo BT-0904 bắt trả trước 80%, không ấn định thời hạn xử lý việc chậm tiến độ, còn trách nhiệm của nhà cung cấp bị giới hạn ở 2 triệu. Bạn cân đối giúp phần tiền còn dư, xem khoản trả trước đáng lo ở đâu và nên sửa những điều khoản gì. Đồng thời giúp mình xác định các việc phải xong trước triển khai, cách xếp lịch đào tạo và bàn giao, để mình biết đã nên chốt hay chưa.

**C05**

> Mình sắp vào họp, bạn tóm lại thành đúng 5 việc ưu tiên nhé; phân biệt giúp phần đã chắc chắn với phần còn phải hỏi lại hoặc xác nhận.

**C06**

> Mình muốn viết gọn bằng tiếng Anh tiêu đề ‘Phân tích ngân sách và rủi ro hợp đồng’ trên slide, viết thế nào?

**C07**

> Cho mình hỏi trợ cấp nội bộ khi nhân viên sinh con thứ hai là bao nhiêu tiền, và có bao nhiêu ngày để nộp hồ sơ?

**C08**

> Có một hợp đồng thuê kho mới, khác cái vừa bàn. Điều khoản phạt của hợp đồng đó có ổn không bạn?

**C09**

> Khoan bàn hợp đồng kho nhé, để việc đó lại sau. Dữ liệu bị xóa nhầm từ 31 ngày trước thì còn trong khoảng thời gian công ty lưu bản sao không?

**C10**

> Hai bạn mới sẽ vào nhóm tháng tới. Mình nên chuẩn bị máy, tài khoản và người hướng dẫn trước bao lâu, rồi theo dõi tuần đầu như thế nào? Một bạn xin làm tại nhà toàn bộ tuần, như vậy có phù hợp với cách làm của công ty không?

**C11**

> Bạn nói rõ giúp mình toàn bộ tiêu chí để hoàn tất chương trình hội nhập nhé. Hai bạn mới cần đạt bài kiểm tra ra sao; nếu chưa đạt thì phải làm gì, bao lâu mới thi lại, và ai là người xác nhận đã hoàn thành?

## Chốt kết quả

Chỉ ghi “đã chạy đủ” khi cả A/B/C có trạng thái cuối cho 11 case tương ứng hoặc từng case bị chặn đã được ghi rõ. “Đã chạy đủ” không đồng nghĩa “đạt toàn bộ”. Những nhánh thiếu quyền, không có child thật, chưa chứng minh dữ liệu đến model hoặc UI chưa kiểm sau reload phải giữ nguyên nhãn chưa đạt/chưa kiểm chứng.

Báo cáo cuối giữ riêng ba lượt, số lượng tin nhắn bổ sung, child được nhận thật, source metadata, câu trả lời và lỗi UI. Không cộng các phiên thử trước, không lấy lượt thành công thay lượt thất bại. Snapshot môi trường cuối được so với fingerprint ban đầu; thay đổi ngoài phạm vi phải ghi lại thay vì che vào tỷ lệ kết quả.

Kế hoạch và JSON được kiểm tra đủ 11 case/lượt, đúng thứ tự, giữ nguyên dữ kiện số và không chứa chỉ dẫn công cụ/chuyên gia/nguồn trong các prompt. Đây là tài liệu QA nội bộ tiếng Việt; không thay tài liệu sản phẩm hoặc bản dịch công khai.
