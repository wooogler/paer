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
git clone https://github.com/wooogler/paer.git
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

## Deployment to Railway

### Prerequisites

- [Railway account](https://railway.app/)
- GitHub repository with your code

### Steps to Deploy

1. **Link to GitHub Repository**

   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project" > "Deploy from GitHub repo"
   - Select the repository

2. **Configure Environment Variables**

   - In Railway dashboard, go to "Variables" tab
   - Add the following variables:
     - `OPENAI_API_KEY` - Your OpenAI API key
     - `NODE_ENV` - Set to "production"
     - `PORT` - Leave as is (Railway sets this)
     - `RAILWAY_ENVIRONMENT` - Set to "true" (this helps with paths)
     - `NIXPACKS_NODE_VERSION` - Set to "20" (or your preferred Node.js version)
     - `VITE_NODE_ENV` - Set to "production"
     - `VITE_API_URL` - Set to "/api"

3. **Deployment Settings**

   - Railway will automatically detect and deploy your application using the `railway.json` file
   - The build process is configured to:
     1. Install dependencies with pnpm
     2. Build shared libraries first
     3. Build client application
     4. Build server application
     5. Start server which serves the client files

4. **Understanding the Railway Configuration**

   - `railway.json`: Defines build and deployment settings
   - `Procfile`: Specifies the web process command
   - Static file serving: Server is configured to serve static files from client/dist

5. **Verifying Deployment**

   - Visit the provided domain to verify your application is running
   - Check the logs in Railway dashboard for any issues
   - Use the health check endpoint `/api/health` to confirm the API is working

6. **Troubleshooting Common Issues**
   - If static files aren't being served, check if the client build completed successfully
   - Ensure environment variables are properly set
   - Review build logs for any errors in the build process

## Scripts

- `pnpm dev`: Run development server (frontend + backend)
- `pnpm build`: Build all packages
- `pnpm start`: Run production server
- `pnpm lint`: Run code linting
- `pnpm test`: Run tests
- `pnpm clean`: Remove node_modules

## License

MIT
