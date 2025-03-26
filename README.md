# Paer Project

A monorepo project containing both frontend and backend.

## Setup

1. Clone the repository
2. Install dependencies with `pnpm install`
3. Copy `.env.example` to `.env` and configure your environment variables

```
# Copy environment variables
cp .env.example .env
```

4. Edit the `.env` file with your configuration

## Environment Variables

All environment variables for both client and server are managed in the root `.env` file:

### Server Variables

- `PORT` - The port the server will run on (default: 3000)
- `NODE_ENV` - Environment (development, production)
- `OPENAI_API_KEY` - Your OpenAI API key

### Client Variables

- `VITE_API_URL` - API URL for the client (default: http://localhost:3000/api)
- `VITE_NODE_ENV` - Client environment

## Development

Start the development server:

```
pnpm dev
```

This will start both the client and server in development mode.

## Project Structure

```
/
├── client/         # Frontend React application
├── server/         # Backend Fastify server
├── shared/         # Shared types and utilities
└── .env            # Environment variables for both client and server
```

## Installation Method

1. Install Dependencies

```bash
# Install dependencies for root package and all subpackages
npm run install:all

# Or install individually
npm run client:install   # Install client dependencies only
npm run server:install   # Install server dependencies only
```

2. Server Environment Variable Setup

```bash
# In the server directory
cp .env.example .env
# Modify the .env file if necessary
```

## Running Development Mode

```bash
# Run client and server simultaneously
npm run dev

# Or run individually
npm run dev:client   # Run client only
npm run dev:server   # Run server only
```

## Build and Production Execution

```bash
# Build both client and server
npm run build

# Run server in production mode after build
npm start
```

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Zustand (State Management)
- Tailwind CSS

### Backend

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
