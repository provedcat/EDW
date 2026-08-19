# EUNDONG DAILY

은동이 개인용 체중·습식 급여·수분 기록 앱입니다. 빌드 단계 없이 GitHub Pages에서 바로 실행됩니다.

## 데이터 구조

- 로그인과 사용자 계정은 없습니다.
- 체중, 목표, 선택 사료 snapshot, 급여 기록은 모두 브라우저 `localStorage`의 `eundong-daily-v1` 키에 날짜별로 저장됩니다.
- Supabase는 기존 `public.feeds`에서 `type = 'wet'`인 공개 검색 가능 사료를 **SELECT만** 합니다. 앱에 포함된 키는 공개 anon key이며 쓰기 또는 관리자 키를 사용하지 않습니다.
- 다음 한국 날짜를 처음 열면 가장 최근 선택 사료를 복사하되, 네 끼의 급여량과 추가 물은 빈 값으로 시작합니다.
- 화면 하단에서 전체 로컬 데이터를 JSON으로 백업하고 복원할 수 있습니다.

Supabase 프로젝트의 `feeds` RLS는 `anon` 역할이 앱 검색에 필요한 공개 행과 열만 읽도록 운영 환경에서 유지해야 합니다. 이 저장소는 개인 기록용 테이블이나 migration을 만들지 않습니다.

## 로컬 확인

```sh
python3 -m http.server 4173
node --test
```
