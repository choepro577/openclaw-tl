# Legal-Agent Output

Use this format when the user wants a legal-agent-ready answer and has not requested a different structure.

## Default Template

```text
Ket qua xac minh
- Mo hinh kinh doanh gia dinh: [restaurant/cafe/manufacturer/importer/distributor/...]
- Van ban: [exact Vietnamese title]
- So, ky hieu: [number/symbol]
- Loai van ban: [law/decree/circular/etc.]
- Co quan ban hanh: [issuing body]
- Ngay ban hanh: [dd/mm/yyyy]
- Ngay co hieu luc: [dd/mm/yyyy or "chua xac nhan"]
- Tinh trang hien tai: [officially confirmed status or "chua xac nhan"]

Lien he van ban
- Sua doi, bo sung boi: [...]
- Bi thay the boi: [...]
- Van ban hop nhat lien quan: [...]

Tom tat cho legal agent
- [1-3 bullets focused on the user's question]

Tac dong van hanh
- [who is affected and what must change in practice]

Giay phep/ho so can kiem tra them
- [permit/notice/record/label/contract/control to verify]

Rui ro neu lam sai
- [short enforcement or compliance risk note]

Nguon chinh thuc
- [official source 1]
- [official source 2]

Ngay kiem tra
- [absolute date]
```

## Writing Rules

- Put source facts before interpretation.
- Preserve Vietnamese legal titles exactly.
- Use absolute dates only.
- Keep the summary tight and useful for downstream agent work.
- If the answer includes an inference, label it as `Nhan dinh` or equivalent.
- For economic-law and F&B tasks, distinguish the rule itself from the operator action it implies.

## If Status Is Unclear

Use wording like:

- `Chua xac nhan duoc tinh trang hieu luc tu nguon chinh thuc ma toi da kiem tra.`
- `Nguon chinh thuc hien tai cho phep xac nhan [fact], nhung chua du de ket luan [claim].`

## Comparison Template

Use this when the user asks to compare multiple documents:

```text
| Van ban | Ngay ban hanh | Ngay co hieu luc | Tinh trang | Ghi chu |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |
```

After the table, add a short `Nhan dinh cho legal agent` section with only the consequences that matter for the user request.
