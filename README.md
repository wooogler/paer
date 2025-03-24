# Paer

프론트엔드와 백엔드가 통합된 모노레포 프로젝트

## 프로젝트 구조

```
/paer
  /client         # React 프론트엔드
  /server         # Express 백엔드
```

## 설치 방법

1. 의존성 설치

```bash
# 루트 패키지와 모든 하위 패키지의 의존성 설치
npm run install:all

# 또는 개별적으로 설치
npm run client:install   # 클라이언트 의존성만 설치
npm run server:install   # 서버 의존성만 설치
```

2. 서버 환경 변수 설정

```bash
# server 디렉토리에서
cp .env.example .env
# 필요한 경우 .env 파일을 수정
```

## 개발 모드 실행

```bash
# 클라이언트와 서버 동시에 실행
npm run dev

# 또는 개별적으로 실행
npm run dev:client   # 클라이언트만 실행
npm run dev:server   # 서버만 실행
```

## 빌드 및 프로덕션 실행

```bash
# 클라이언트와 서버 모두 빌드
npm run build

# 빌드 후 프로덕션 모드로 서버 실행
npm start
```

## 기술 스택

### 프론트엔드

- React
- TypeScript
- Vite
- Zustand (상태 관리)
- Tailwind CSS

### 백엔드

- Express
- TypeScript
- Node.js

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    "react-x": reactX,
    "react-dom": reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs["recommended-typescript"].rules,
    ...reactDom.configs.recommended.rules,
  },
});
```
