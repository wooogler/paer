# Paer

Paer is a web application for writing and managing academic papers.

## Live Demo Instructions
**Date:** May 6, 2025

### Setup 

1. **User login**: Log in the system with your name ***as appears in the presentation sign-up sheet***.
2. **Start a project**.
3. (owner only) **Invite collaborators**.

### Task

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Vite
- **Backend**: Fastify, TypeScript
- **Database**: MongoDB
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

## Project Overview

### Client (`/client`)
React-based frontend application that provides an interactive document editor with AI assistance. Features a three-pane layout:
- Document structure navigation
- Rich text editor
- AI chat interface for document writing assistance

Main implementation in `src/components/Layout.tsx` with state management in `src/store/`.

### Server (`/server`)
Node.js backend that handles:
- Document processing and management
- AI integration for intelligent writing assistance
- MongoDB database operations
- API endpoints

Core functionality in `src/routes/` for API endpoints and `src/services/` for business logic.

The application allows users to write and structure documents while getting real-time AI assistance through an integrated chat interface.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm 8 or higher
- MongoDB
- OpenAI API key

### Local MongoDB Setup

1. **Install MongoDB**

   - **macOS (using Homebrew)**:
     ```bash
     brew tap mongodb/brew
     brew install mongodb-community
     brew services start mongodb-community
     ```

   - **Windows**:
     - Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
     - Follow the installation wizard
     - MongoDB will be installed as a service and started automatically

   - **Linux (Ubuntu/Debian)**:
     ```bash
     sudo apt update
     sudo apt install mongodb
     sudo systemctl start mongodb
     sudo systemctl enable mongodb
     ```

2. **Verify MongoDB Installation**

   ```bash
   mongosh
   ```

   If you see the MongoDB shell prompt, the installation was successful.

3. **Configure MongoDB for Development**

   - Create a data directory (if not created automatically):
     ```bash
     mkdir -p ~/data/db
     ```

   - Set up environment variables in `server/.env`:
     ```
     MONGODB_URI=mongodb://localhost:27017/paer
     ```

4. (Optional) **Populate the Database**
   * To populate the database for live demo in CS6724, run 
      ```bash
      pnpm seed:user
      ```


5. **Start MongoDB**

   - If not already running, start MongoDB:
     - **macOS**: `brew services start mongodb-community`
     - **Windows**: MongoDB service should be running automatically
     - **Linux**: `sudo systemctl start mongodb`

6. **Verify MongoDB Connection**

   - Check if MongoDB is running:
     ```bash
     mongosh
     ```
   - You should see the MongoDB shell prompt
   - Type `exit` to leave the shell

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

2. **Add MongoDB to Railway**

   - In your Railway project, click "New" > "Database"
   - Select "MongoDB"
   - Railway will automatically provision a MongoDB instance
   - Note down the connection string provided by Railway

3. **Configure Environment Variables**

   - In Railway dashboard, go to "Variables" tab
   - Add the following variables:
     - `OPENAI_API_KEY` - Your OpenAI API key
     - `MONGODB_URI` - Your MongoDB connection string (from Railway)
     - `NODE_ENV` - Set to "production"
     - `PORT` - Leave as is (Railway sets this)
     - `VITE_NODE_ENV` - Set to "production"
     - `VITE_API_URL` - Set to "/api"

4. **Configure Build Settings**

   - In Railway dashboard, go to "Settings" tab
   - Set the following build settings:
     - Build Command: `pnpm install && pnpm build`
     - Start Command: `pnpm start`
     - Root Directory: `.`
     - Health Check Path: `/api/health`

5. **Deployment Settings**

   - Railway will automatically detect and deploy your application
   - The build process is configured to:
     1. Install dependencies with pnpm
     2. Build shared libraries first
     3. Build client application
     4. Build server application
     5. Start server which serves the client files

6. **Verifying Deployment**

   - Visit the provided domain to verify your application is running
   - Check the logs in Railway dashboard for any issues
   - Use the health check endpoint `/api/health` to confirm the API is working
   - Verify MongoDB connection by checking if you can create and read documents

7. **Troubleshooting Common Issues**
   - Ensure MongoDB connection string is properly formatted
   - Verify database user credentials are correct
   - Ensure environment variables are properly set
   - Review build logs for any errors in the build process
   - Check if the build command completed successfully
   - Verify that the start command is correct
   - Ensure all required environment variables are set

### Railway CLI (Optional)

If you want to manage your Railway deployment from the command line:

```bash
# Install Railway CLI
pnpm add -g @railway/cli

# Login to Railway
railway login

# Link your project
railway link

# Deploy your application
railway up
```

## Scripts

- `pnpm dev`: Run development server (frontend + backend)
- `pnpm build`: Build all packages
- `pnpm start`: Run production server
- `pnpm lint`: Run code linting
- `pnpm test`: Run tests
- `pnpm seed:users` Populate the database with seed users for CS6724

## License

MIT
