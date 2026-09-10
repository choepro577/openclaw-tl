#!/usr/bin/env python3
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

GIFT_URL = "https://hos.comnieuthienly.com/emenu/api/testapp/check-giftcard?voucherId={code}"
PAY_URL = "https://hos.comnieuthienly.com/emenu/api/testapp/check-paycard?voucherId={code}"
TIMEOUT = 20


def fetch_json(url: str) -> Dict[str, Any]:
    req = Request(url, headers={"User-Agent": "OpenClaw-CSKH/1.0", "Accept": "application/json"})
    try:
        with urlopen(req, timeout=TIMEOUT) as resp:
            body = resp.read().decode('utf-8', errors='replace')
            return {
                'ok': True,
                'status': getattr(resp, 'status', 200),
                'data': json.loads(body) if body.strip() else None,
                'raw': body,
            }
    except HTTPError as e:
        body = e.read().decode('utf-8', errors='replace') if hasattr(e, 'read') else ''
        parsed = None
        if body.strip():
            try:
                parsed = json.loads(body)
            except Exception:
                parsed = None
        return {'ok': False, 'status': e.code, 'error': str(e), 'data': parsed, 'raw': body}
    except URLError as e:
        return {'ok': False, 'status': None, 'error': str(e), 'data': None, 'raw': ''}
    except Exception as e:
        return {'ok': False, 'status': None, 'error': str(e), 'data': None, 'raw': ''}


def looks_empty(value: Any) -> bool:
    if value is None:
        return True
    if value == '':
        return True
    if isinstance(value, dict) and len(value) == 0:
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False


def unwrap_payload(payload: Any) -> Any:
    current = payload
    seen = set()
    while isinstance(current, dict):
        ident = id(current)
        if ident in seen:
            break
        seen.add(ident)
        moved = False
        for key in ('data', 'result', 'voucher', 'value', 'item'):
            if key in current:
                current = current[key]
                moved = True
                break
        if not moved:
            break
    return current


def extract_named_payload(payload: Any, keys: List[str]) -> Any:
    current = unwrap_payload(payload)
    if isinstance(current, dict):
        lower_map = {str(k).lower(): v for k, v in current.items()}
        for key in keys:
            lk = key.lower()
            if lk in lower_map:
                return lower_map[lk]
    return current


def find_first(obj: Any, keys: List[str]) -> Any:
    wanted = {k.lower() for k in keys}
    def walk(x: Any) -> Any:
        if isinstance(x, dict):
            for k, v in x.items():
                if str(k).lower() in wanted and v not in (None, ''):
                    return v
            for v in x.values():
                found = walk(v)
                if found not in (None, ''):
                    return found
        elif isinstance(x, list):
            for item in x:
                found = walk(item)
                if found not in (None, ''):
                    return found
        return None
    return walk(obj)


def parse_date(value: Any) -> Optional[datetime]:
    if value in (None, ''):
        return None
    if isinstance(value, (int, float)):
        try:
            n = float(value)
            if n > 1e12:
                n /= 1000.0
            return datetime.fromtimestamp(n, tz=timezone.utc)
        except Exception:
            return None
    s = str(value).strip()
    if not s:
        return None
    m = re.search(r'/Date\((\d+)\)/', s)
    if m:
        n = float(m.group(1))
        if n > 1e12:
            n /= 1000.0
        return datetime.fromtimestamp(n, tz=timezone.utc)
    s2 = s.replace('Z', '+00:00')
    for candidate in (s2, s):
        try:
            dt = datetime.fromisoformat(candidate)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            pass
    for fmt in (
        '%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y %H:%M:%S', '%d/%m/%Y',
        '%m/%d/%Y %H:%M:%S', '%m/%d/%Y'
    ):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return None


def to_iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.astimezone(timezone.utc).isoformat() if dt else None


def summarize_card(code: str, card_type: str, raw_data: Any) -> Dict[str, Any]:
    payload = extract_named_payload(raw_data, ['GiftCard'] if card_type == 'giftcard' else ['PayCard'])
    used_date_raw = find_first(payload, ['usedDate', 'used_date', 'redeemedDate', 'paymentDate'])
    start_date_raw = find_first(payload, ['startDate', 'start_date', 'issueDate', 'fromDate', 'validFrom'])
    end_date_raw = find_first(payload, ['endDate', 'end_date', 'expireDate', 'expiredDate', 'validTo', 'toDate'])
    now = datetime.now(timezone.utc)
    used_dt = parse_date(used_date_raw)
    start_dt = parse_date(start_date_raw)
    end_dt = parse_date(end_date_raw)
    if used_dt:
        usage_status = 'used'
        usage_label_vi = 'đã sử dụng'
    else:
        usage_status = 'unused'
        usage_label_vi = 'chưa sử dụng'
    if end_dt and end_dt < now:
        expiry_status = 'expired'
        expiry_label_vi = 'hết hạn'
    elif start_dt and start_dt > now:
        expiry_status = 'not_started'
        expiry_label_vi = 'chưa tới ngày hiệu lực'
    elif start_dt or end_dt:
        expiry_status = 'active'
        expiry_label_vi = 'còn hạn'
    else:
        expiry_status = 'unknown'
        expiry_label_vi = 'chưa xác định hạn'
    return {
        'code': code,
        'type': card_type,
        'type_label_vi': 'giftcard' if card_type == 'giftcard' else 'paycard',
        'matched': True,
        'usage_status': usage_status,
        'usage_label_vi': usage_label_vi,
        'expiry_status': expiry_status,
        'expiry_label_vi': expiry_label_vi,
        'usedDate': used_date_raw,
        'usedDateIso': to_iso(used_dt),
        'startDate': start_date_raw,
        'startDateIso': to_iso(start_dt),
        'endDate': end_date_raw,
        'endDateIso': to_iso(end_dt),
        'payload': payload,
    }


def check_code(code: str) -> Dict[str, Any]:
    encoded = quote(code, safe='')
    gift = fetch_json(GIFT_URL.format(code=encoded))
    pay = fetch_json(PAY_URL.format(code=encoded))
    gift_payload = extract_named_payload(gift.get('data'), ['GiftCard'])
    pay_payload = extract_named_payload(pay.get('data'), ['PayCard'])
    gift_has = not looks_empty(gift_payload)
    pay_has = not looks_empty(pay_payload)
    matches = []
    if gift_has:
        matches.append(summarize_card(code, 'giftcard', gift.get('data')))
    if pay_has:
        matches.append(summarize_card(code, 'paycard', pay.get('data')))
    result: Dict[str, Any] = {
        'code': code,
        'giftcard_api': gift,
        'paycard_api': pay,
        'giftcard_has_data': gift_has,
        'paycard_has_data': pay_has,
        'matches': matches,
    }
    if gift_has and not pay_has:
        result['classification'] = 'giftcard'
        result['classification_label_vi'] = 'giftcard'
    elif pay_has and not gift_has:
        result['classification'] = 'paycard'
        result['classification_label_vi'] = 'paycard'
    elif gift_has and pay_has:
        result['classification'] = 'multiple'
        result['classification_label_vi'] = 'xuất hiện ở cả giftcard và paycard'
    else:
        result['classification'] = 'not_found'
        result['classification_label_vi'] = 'chưa tìm thấy mã'
    return result


def collect_codes(args_codes: List[str]) -> List[str]:
    raw = ' '.join(args_codes)
    if not raw.strip():
        return []
    parts = re.split(r'[\s,;|]+', raw.strip())
    seen = set()
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def build_summary(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        'total_codes': len(results),
        'found': [r['code'] for r in results if r['classification'] != 'not_found'],
        'not_found': [r['code'] for r in results if r['classification'] == 'not_found'],
        'used': [m['code'] for r in results for m in r['matches'] if m['usage_status'] == 'used'],
        'unused': [m['code'] for r in results for m in r['matches'] if m['usage_status'] == 'unused'],
        'expired': [m['code'] for r in results for m in r['matches'] if m['expiry_status'] == 'expired'],
        'active': [m['code'] for r in results for m in r['matches'] if m['expiry_status'] == 'active'],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Check HOS giftcard/paycard codes against both APIs.')
    parser.add_argument('codes', nargs='*', help='One or more voucher/card codes')
    parser.add_argument('--pretty', action='store_true', help='Pretty-print JSON output')
    args = parser.parse_args()
    codes = collect_codes(args.codes)
    if not codes:
        print(json.dumps({'ok': False, 'error': 'No codes provided'}, ensure_ascii=False))
        return 2
    results = [check_code(code) for code in codes]
    payload = {'ok': True, 'summary': build_summary(results), 'results': results}
    if args.pretty:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(json.dumps(payload, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    sys.exit(main())
