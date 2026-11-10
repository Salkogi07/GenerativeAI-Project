"""공공데이터 JSON(data/raw/*.json)을 정리해서 Supabase places 테이블에 넣을 SQL을 만들어요.

    python scripts/build_places.py            # data/places.json, supabase/seed.sql 생성
    python scripts/build_places.py --selftest # 정리 규칙 확인

- 공원: 데이터에 있는 좌표를 쓰되, 위도/경도가 뒤바뀐 것·"127.13°" 같은 문자열·여러 줄 값을 고쳐요.
- 카페: 좌표가 없어서 도로명 주소를 브이월드 지오코더로 좌표로 바꿔요(VWORLD_KEY 환경변수 필요).
  결과는 data/geocode_cache.json에 저장해서 같은 주소는 다시 묻지 않아요. 키가 없으면 카페는 건너뛰어요.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW, CACHE = ROOT / 'data' / 'raw', ROOT / 'data' / 'geocode_cache.json'
LAT, LNG = (37.4, 37.72), (126.7, 127.3)  # 서울 + 과천(서울대공원)까지 포함하는 범위

CAFE_TYPES = {'커피숍', '까페'}  # 관악구 데이터의 위생업태 중 실제 카페
# ponytail: 이름 키워드로 거르는 단순 규칙. 놓치는 곳이 있으면 여기에 키워드를 더해요.
NOT_CAFE = ['PC', 'pc', '피씨', '씨유', 'CU ', 'GS25', '지에스', '이마트24', '세븐일레븐', '훼미리마트',
            '볼링', '요가', '짐', '병원', '스터디카페', '만화카페', '라운지', '김밥', '돈까스', '닭강정', '핫도그']


def num(v):
    """'127.13°', '37.5\\n37.6', 37.5 → float. 못 읽으면 None."""
    if v is None:
        return None
    m = re.search(r'-?\d+(?:\.\d+)?', str(v).split('\n')[0])
    return float(m.group()) if m else None


def fix_coord(lat, lng):
    lat, lng = num(lat), num(lng)
    if lat is None or lng is None:
        return None
    if lat > 100 and lng < 100:  # 위도/경도 뒤바뀜
        lat, lng = lng, lat
    ok = LAT[0] <= lat <= LAT[1] and LNG[0] <= lng <= LNG[1]
    return (round(lat, 7), round(lng, 7)) if ok else None


def clean_addr(a):
    """'서울특별시 관악구 남부순환로 1612, 1~3층 (신림동)' → '서울특별시 관악구 남부순환로 1612'"""
    return re.sub(r'\s*\(.*$', '', (a or '').split(',')[0]).strip() or None


def is_cafe(name, kind):
    return kind in CAFE_TYPES and not any(k in name for k in NOT_CAFE)


def district(addr):
    m = re.search(r'(\S+구)\s', addr or '')
    return m.group(1) if m else '기타'


def geocode(addr, key, cache):
    if addr in cache:
        return cache[addr]
    q = urllib.parse.urlencode({'service': 'address', 'request': 'getcoord', 'version': '2.0', 'crs': 'epsg:4326',
                                'address': addr, 'type': 'road', 'format': 'json', 'key': key})
    for attempt in range(3):  # 네트워크가 잠깐 끊겨도 전체가 멈추지 않게 다시 시도해요
        try:
            with urllib.request.urlopen('https://api.vworld.kr/req/address?' + q, timeout=20) as r:
                res = json.load(r)['response']
            break
        except OSError:
            time.sleep(2 * (attempt + 1))
    else:
        return None  # 이번에는 실패. 캐시에 남기지 않아서 다음 실행 때 다시 시도해요
    pt = res.get('result', {}).get('point') if res.get('status') == 'OK' else None
    cache[addr] = [float(pt['y']), float(pt['x'])] if pt else None
    if len(cache) % 50 == 0:
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding='utf-8')
    time.sleep(0.05)
    return cache[addr]


def read_raw():
    parks, cafes = [], []
    for f in sorted(RAW.glob('*.json')):
        for it in json.loads(f.read_text(encoding='utf-8'))['items']:
            if 'parkName' in it:
                parks.append(it)
            elif 'businessName' in it:
                cafes.append(it)
    return parks, cafes


def build():
    parks, cafes = read_raw()
    out, skipped = [], []
    for p in parks:
        c = fix_coord(p.get('latitude'), p.get('longitude'))
        if not c:
            skipped.append(('공원 좌표 없음', p['parkName']))
            continue
        out.append({'source': 'seoul_parks', 'source_key': str(p['serialNumber']), 'name': p['parkName'],
                    'category': '공원', 'address': p.get('parkAddress'), 'lat': c[0], 'lng': c[1]})

    key = os.environ.get('VWORLD_KEY')
    cache = json.loads(CACHE.read_text(encoding='utf-8')) if CACHE.exists() else {}
    for c in cafes:
        kind = c.get('sanitationBusinessType') or c.get('businessType')
        if c.get('businessStatus', '영업') != '영업' or not is_cafe(c['businessName'], kind):
            continue
        addr = clean_addr(c.get('roadAddress'))
        if not addr:
            skipped.append(('카페 주소 없음', c['businessName']))
            continue
        if not key and addr not in cache:
            skipped.append(('VWORLD_KEY 없음', c['businessName']))
            continue
        pt = geocode(addr, key, cache) if key else cache[addr]
        c2 = fix_coord(*pt) if pt else None
        if not c2:
            skipped.append(('주소→좌표 실패', f"{c['businessName']} ({addr})"))
            continue
        out.append({'source': f'cafe_{district(addr)}', 'source_key': str(c.get('serialNumber') or f"{c['businessName']}|{addr}"),
                    'name': c['businessName'], 'category': '카페', 'address': addr, 'lat': c2[0], 'lng': c2[1]})
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding='utf-8')

    # 같은 출처 안에서 key가 겹치면(예: 같은 이름·주소 2개 층) 하나만 남겨요
    uniq = {(p['source'], p['source_key']): p for p in out}
    out = list(uniq.values())
    (ROOT / 'data' / 'places.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    (ROOT / 'supabase' / 'seed.sql').write_text(to_sql(out), encoding='utf-8')
    by = {}
    for p in out:
        by[p['source']] = by.get(p['source'], 0) + 1
    print('장소', len(out), by)
    print('건너뜀', len(skipped))
    for why, name in skipped[:30]:
        print(' -', why, name)


def to_sql(rows):
    q = lambda s: 'null' if s is None else "'" + str(s).replace("'", "''") + "'"
    vals = ',\n'.join(f"({q(r['source'])},{q(r['source_key'])},{q(r['name'])},{q(r['category'])},{q(r['address'])},{r['lat']},{r['lng']})"
                      for r in rows)
    return ('-- scripts/build_places.py가 만든 파일이에요. 직접 고치지 마세요.\n'
            'insert into public.places (source, source_key, name, category, address, lat, lng) values\n'
            f'{vals}\n'
            'on conflict (source, source_key) do update set name = excluded.name, category = excluded.category,\n'
            '  address = excluded.address, lat = excluded.lat, lng = excluded.lng;\n')


def selftest():
    assert fix_coord(37.5430717, 127.0417982) == (37.5430717, 127.0417982)
    assert fix_coord(127.052334, 37.477704) == (37.477704, 127.052334)          # 달터: 뒤바뀜
    assert fix_coord('37.5593°', '127.1310°') == (37.5593, 127.131)             # 암사: 문자열
    assert fix_coord('37.546\n37.553', '127.009\n127.017') == (37.546, 127.009)  # 응봉: 여러 줄
    assert fix_coord(None, None) is None                                        # 물푸레: 없음
    assert fix_coord(37.627077, 37.627077) is None                              # 범위 밖
    assert clean_addr('서울특별시 관악구 남부순환로 1612, 1~3층 (신림동)') == '서울특별시 관악구 남부순환로 1612'
    assert clean_addr('서울특별시 관악구 신림로 158 (신림동)') == '서울특별시 관악구 신림로 158'
    assert clean_addr(None) is None
    assert is_cafe('스타벅스 신림점', '커피숍') and not is_cafe('피씨태그 PC방', '커피숍')
    assert not is_cafe('씨유 관악예술인점', '커피숍') and not is_cafe('카페인더하우스', '한식')
    assert district('서울특별시 강서구 양천로 431') == '강서구'
    assert "'O''Neil'" in to_sql([{'source': 's', 'source_key': '1', 'name': "O'Neil", 'category': '카페',
                                   'address': None, 'lat': 37.5, 'lng': 127.0}])
    print('selftest ok')


if __name__ == '__main__':
    selftest() if '--selftest' in sys.argv else build()
