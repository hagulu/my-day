# My Day

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
