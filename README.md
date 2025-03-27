# Paer

Paer is a web application for writing and managing academic papers.

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Fastify, TypeScript
- **Shared**: TypeScript, Zod
- **Package Manager**: pnpm (workspaces)
- **AI**: OpenAI API

## Project Structure

```
paer/
├── client/          # React frontend
├── server/          # Fastify backend
└── shared/          # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/paer.git
cd paer

# Install dependencies
pnpm install

# Set up environment variables
cp server/.env.example server/.env
# Open server/.env and configure your environment variables
```

### Development Server

```bash
# Run all services (frontend + backend)
pnpm dev

# Run individual services
pnpm dev:client    # Frontend only
pnpm dev:server    # Backend only
```

### Build

```bash
# Build all packages
pnpm build

# Build individual packages
pnpm build:client
pnpm build:server
pnpm build:shared
```

### Production

```bash
pnpm start
```

## Scripts

- `pnpm dev`: Run development server (frontend + backend)
- `pnpm build`: Build all packages
- `pnpm start`: Run production server
- `pnpm lint`: Run code linting
- `pnpm test`: Run tests
- `pnpm clean`: Remove node_modules

## License

MIT
