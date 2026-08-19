# EUNDONG DAILY

은동이의 체중, 습식 급여량, 칼로리와 수분 섭취량을 여러 기기에서 기록하는 개인용 GitHub Pages 앱입니다.

로그인 UI는 없습니다. 새 기기에서는 긴 비밀 연결 URL을 한 번 열어 연결하고, 이후에는 일반 앱 주소만 열면 됩니다. 개인 기록은 Supabase에 저장되며 `public.feeds`는 습식사료 검색용으로만 읽습니다.

## 운영 주소

일반 주소:

`https://provedcat.github.io/EDW/`

최초 연결 주소 형식:

`https://provedcat.github.io/EDW/#sync=PRIVATE_TOKEN`

앱은 `#sync=` 값을 localStorage에 보관한 뒤 `history.replaceState()`로 주소창에서 즉시 제거합니다. 비밀 token 원문은 GitHub 저장소에 넣지 않습니다.

## 동기화 구조

- 브라우저 → `eundong-sync` Supabase Edge Function
- 요청 헤더 `X-Eundong-Sync-Token`의 SHA-256 digest 검증
- digest는 `eundong_access.token_hash`에만 저장
- Edge Function만 은동이 개인 테이블을 읽고 씀
- 개인 테이블은 RLS 활성화 + `anon`/`authenticated` 직접 권한 없음
- `feeds`의 실제 UUID `id`를 사용하며, 선택 시 제품명·수분·최종 적용 kcal/kg를 snapshot

## 주요 데이터

- `eundong_settings`: 목표 체중과 목표 기간
- `eundong_daily_records`: 날짜별 체중
- `eundong_daily_feeds`: 날짜별 습식사료 1~3
- `eundong_meals`: 하루 4회 급여량과 추가 물
- `eundong_access`: 비밀 연결 token의 SHA-256 digest

## 보안

다음 값은 프론트엔드나 GitHub에 저장하지 않습니다.

- service role / secret API key
- 비밀 연결 token 원문

Edge Function은 로그인 JWT 대신 충분히 긴 개인 sync token을 자체 검증하므로 `verify_jwt = false`입니다. Supabase 서버 권한은 함수 런타임 안에서만 사용됩니다.

## 로컬 검사

```sh
python3 -m http.server 4173
node --test
```
