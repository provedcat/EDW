# EUNDONG DAILY

은동이 한 마리의 체중, 습식 급여, 수분을 여러 기기에서 기록하는 GitHub Pages 정적 앱입니다. 로그인 UI 대신 긴 비밀 URL fragment를 한 번 열어 연결하며, 개인 데이터는 Supabase Edge Function만 읽고 씁니다.

## 배포

1. Supabase CLI로 `supabase/migrations/202608190001_eundong_daily.sql`을 적용합니다.
2. 32바이트 이상의 무작위 token을 만들고 SHA-256 hex digest를 구합니다.
   ```sh
   TOKEN="$(openssl rand -base64 48 | tr -d '\n')"
   printf %s "$TOKEN" | openssl dgst -sha256
   ```
3. Edge Function secret `EUNDONG_SYNC_TOKEN_SHA256`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 설정하고 `eundong-sync`를 배포합니다. 실제 token과 service role key는 저장소나 브라우저 코드에 넣지 않습니다.
4. 이 저장소 루트를 GitHub Pages로 배포하고, 최초 기기마다 `https://provedcat.github.io/catfoodcalculator/#sync=TOKEN`을 한 번 엽니다. 앱은 token을 localStorage에 보관한 뒤 fragment를 즉시 제거합니다.

```sh
supabase db push
supabase secrets set EUNDONG_SYNC_TOKEN_SHA256=<64자리-hex>
supabase functions deploy eundong-sync --no-verify-jwt
```

## 보안 구조

- 신규 네 테이블은 RLS가 켜져 있고 `anon`/`authenticated` 정책과 권한이 없습니다.
- 함수는 매 요청의 `X-Eundong-Sync-Token`을 SHA-256 해시하고 환경 변수의 digest와 constant-time 비교한 뒤 service role로 접근합니다.
- 사료 검색도 함수가 기존 `public.feeds`를 읽기만 하며, Proved에서 사용하던 최종 적용 열 `final_me`를 snapshot 합니다.
- 허용 origin은 GitHub Pages 운영 주소와 localhost 개발 주소뿐입니다.

## 로컬 검사

```sh
python3 -m http.server 4173
node --test
```

Supabase 원격 프로젝트에 실제 migration/function을 적용하고 통합 검증하려면 프로젝트 배포 권한과 네트워크가 필요합니다.
