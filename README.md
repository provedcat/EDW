# EUNDONG DAILY

은동이 개인용 체중·습식 급여·수분 기록 앱입니다. 빌드 단계 없는 HTML/CSS/ES modules 구조로 GitHub Pages에서 실행됩니다.

## 배포 전 준비

1. Supabase SQL editor 또는 CLI에서 `supabase/migrations/202608190001_eundong_daily.sql`을 적용합니다.
2. Supabase Auth의 허용 Redirect URL에 Pages URL을 추가합니다.
3. 로그인 계정의 기존 `public.cats` 행 이름이 `은동이`인지 확인합니다.

기존 저장소 코드에서 확인된 운영 스키마는 `cats(id, user_id, name)`, `weight_records(cat_id, user_id, recorded_date, weight_kg)`이며, Proved의 기존 사료 UI는 `feeds.final_me`를 kcal/kg의 최종값으로 사용했습니다. 따라서 앱은 사료 영양값을 재계산하지 않습니다. 네트워크가 제한된 개발 환경에서는 원격 schema/RLS introspection을 수행할 수 없으므로 migration 적용 전 staging에서 FK 타입과 기존 정책을 확인하세요. 브라우저에는 공개 anon key만 포함되며 개인 테이블은 authenticated + 소유자 RLS로 보호됩니다.

## 로컬 확인

```sh
python3 -m http.server 4173
node --test
```
