# My Day

## Cloudflare Workers에서 인기 대출 도서 설정

1. Cloudflare 대시보드의 **Workers & Pages**에서 기존 Worker를 엽니다. GitHub 저장소와 프로덕션 브랜치는 기존 연결을 사용합니다. 대시보드의 Worker 이름이 `my-day`와 다르면 `wrangler.jsonc`의 `name`을 실제 이름으로 맞춥니다.
2. **Settings → Build**에서 기존 빌드가 `npm run build`로 `dist`를 만들고, 배포 명령이 추가된 Wrangler 설정을 읽는지 확인합니다. 빌드 명령이 비어 있으면 `npm run build`를 지정합니다. 배포 명령이 정적 파일 전용이라면 `npx wrangler deploy`를 사용합니다. 기존 Vite 환경변수와 도메인은 현재 설정을 사용합니다.
3. **Settings → Variables and Secrets → Add**에서 유형을 **Secret**, 이름을 `LIBRARY_API_KEY`로 지정하고 도서관 정보나루 발급 키를 저장한 뒤 배포합니다. 정적 에셋 전용 Worker에서 Secret 추가가 비활성화되어 있다면 코드가 포함된 버전을 먼저 배포합니다.
4. 배포된 사이트의 `/api/books/popular`에서 `books` 배열이 담긴 JSON을 확인하고 홈의 도서 카드 3개를 확인합니다.

로컬에서는 `.dev.vars`에 `LIBRARY_API_KEY=발급받은키`를 추가한 후 `npm run build`와 `npx wrangler dev`를 실행하면 홈과 API를 같은 주소에서 확인할 수 있습니다.
React를 수정하며 테스트할 때는 Wrangler를 기본 포트 `8787`에서 실행한 상태로 `npm run dev`를 실행합니다. Vite는 인기 대출 도서 요청을 로컬 Wrangler로 전달합니다.

## 할 일 데이터베이스 설정

1. 기존 일기와 같은 Supabase 프로젝트에 `supabase/migrations`의 할 일 마이그레이션을 순서대로 적용합니다.
2. `.env.local`의 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`가 해당 프로젝트를 가리키는지 확인합니다.

테스트용 할 일 목록은 로그인 없이 이용할 수 있으며, 같은 Supabase 프로젝트에 접속한 사용자가 목록을 공유합니다.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
