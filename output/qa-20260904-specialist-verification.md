# Chuyên gia trong ảnh có thực sự được gọi không?

**Có.** Kiểm chứng bằng bản ghi thực thi và transcript riêng, không dựa vào dòng “đã chuyển” trên UI.

## Lượt trong ảnh

1. Người dùng đồng ý bàn giao một lần trong session `cb4c9413-2f00-4220-b16a-b23457b2d62d`.
2. Finance child run `e23bea00-aa9d-45e8-a04e-734e9cf910f0` bắt đầu lúc **23:23:18 ngày04/09/2026 UTC+7**.
3. Chuyên gia dùng `openai/gpt-5.6-luna`, có transcript riêng `e0d42c6c-db59-4f96-8677-3ca3b65e6064`, trả **1.590 ký tự**, hoàn tất **23:23:36**, outcome `ok`.
4. Agent chính Sol tổng hợp và trả lời lúc **23:23:50**. Dòng thông báo bàn giao được host tạo sau khi có child được tiếp nhận, không phải lời model tự khẳng định đã gọi.

## Lỗi thật đã tìm thấy và sửa

Kết quả của chuyên gia có đủ **204 triệu / 294 triệu / hòa vốn120 triệu**, nhưng phần chuyển về agent chính chỉ giữ512 ký tự đầu. Nó mất hai số sau. Vì vậy câu trả lời cuối đúng số học **không tự chứng minh** agent chính đã nhận đủ kết quả chuyên gia.

Đã sửa producer `src/agents/subagents/announce/subagent-announce-output.ts`: nếu toàn bộ kết quả cùng nhãn vừa giới hạn4.096 ký tự sẵn có thì gửi đủ; khi vượt giới hạn vẫn dùng cơ chế cắt có đánh dấu, ưu tiên lỗi và giữ sanitize/escape. Không tăng giới hạn hay bỏ kiểm tra an toàn.

## Chạy lại trên Chrome sau sửa

Session mới: `953195f0-fac1-4df6-b484-f75864aa5c13`. Gửi lại nguyên câu hỏi tài chính, đồng ý đúng một lần.

- Child run: `330c3b6b-f996-490a-9ce3-17e42c34900d`.
- Chạy23:34:52 →23:35:09, có assistantLuna riêng, outcome `ok`.
- Kết quả **1.478 ký tự** được đối chiếu với bản nhận của agent chính tại seq5: **khớp toàn bộ projection đã sanitize, không dấu cắt**.
- Agent chính hoàn tất thông báo kết quả23:35:28; UI hiển thị đủ204/294/120 và lịch sử tải lại được.
- Regression: trước sửa hai case kết luận cuối thất bại; sau sửa **103/103 tests** của output/settle-wake đạt.

Tái kiểm metadata read-only:

```sh
node --import tsx output/qa-20260904-live-delegation-proof.mjs 953195f0
```

Chạy tại checkout `openclaw-tl`. Artifact [JSON bằng chứng live](qa-20260904-c03-live-proof.json) không chứa hidden reasoning, credential hay nội dung nguồn riêng.

## Xác nhận lại trong phiên tổng hợp

Trong cùng phiên mới `e4bfd79e-6068-4ced-8ae2-5d126ce033ce`, gửi nguyên câu hỏi C03 và đồng ý một lần:

- Child `da566ce6-b197-4058-8d15-b36fa31e9aa9` thực sự chạy 00:13:10 → 00:13:33 ngày 05/09/2026, có transcript/assistant Luna riêng.
- Parent nhận đủ **2.179 ký tự** ở seq16, không cắt; đối chiếu bằng canonical projection và hash. Kết quả cuối lúc 00:13:50 trả đúng 204/294/120.
- C04 sau đó gọi thật **hai chuyên gia** rồi parent đọc 7 tài liệu nội bộ. Hai child trả tổng 5.519 ký tự, nên bàn giao vẫn rút gọn theo giới hạn hiện hữu; không khẳng định đã nhận nguyên tất cả.
- Một ghi chú trong child C03 tính tiền cọc hai lần là sai; parent không lặp lỗi đó trong đáp án cuối. Bằng chứng chạy thật không đồng nghĩa mọi nội dung chuyên gia đều đúng.

[Phiên tổng hợp và kết quả từng case](qa-natural-combined-session-20260904.md).

## Giới hạn còn lại

- Đã sửa source và kiểm chứng runtime **QA cổng19789**; không deploy/restart gateway chính18789.
- Kết quả nhiều chuyên gia vượt tổng4.096 ký tự vẫn bị rút gọn theo giới hạn hiện hữu; không tuyên bố bản sửa này làm mọi kết quả dài được chuyển nguyên vẹn.
- CaseC04 có lỗi xin phép `sandbox_exec` riêng do thiếu Enterprise session ở kênh approval. Chuyên gia vẫn chạy và có câu trả lời; không đồng nhất lỗi công cụ với “chưa gọi chuyên gia”. Chưa sửa kênh quyền đó và không tự cấp thêm quyền.
- Các case còn lại và phiên tổng hợp theo yêu cầu được theo dõi trong [báo cáo kiểm thử](qa-natural-session-20260904-results.md).
