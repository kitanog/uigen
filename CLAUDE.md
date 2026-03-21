# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. Users describe components in natural language, Claude generates them using a virtual file system, and they render immediately in a sandboxed iframe.

## Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run test         # Run all tests with Vitest
npm run setup        # Initial setup: install deps + Prisma migrate/generate
npm run db:reset     # Reset SQLite database
```

Run a single test file:
```bash
npx vitest run src/lib/__tests__/file-system.test.ts
```

## Environment Variables

Copy `.env.example` to `.env`. Two variables matter:
- `ANTHROPIC_API_KEY` — optional; if absent, a mock provider generates static examples
- `JWT_SECRET` — defaults to `"development-secret-key"` if unset

## Architecture

### Data Flow

1. User sends a prompt in `ChatInterface`
2. `chat-context.tsx` serializes the virtual file system and POSTs to `/api/chat`
3. `/api/chat/route.ts` streams Claude responses using two tools: `str_replace_editor` (view/create/edit files) and `file_manager` (rename/delete)
4. Streamed tool calls update `FileSystemContext` in real time
5. `PreviewFrame` detects changes → `jsx-transformer.ts` transpiles JSX/TS with Babel → generates an import map (esm.sh CDN for npm packages, blob URLs for local files) → injects into iframe
6. On completion, if the user is authenticated, the project (messages + file data) is persisted to SQLite

### Key Abstractions

**VirtualFileSystem** (`src/lib/file-system.ts`): In-memory tree (`Map<path, FileNode>`). No files are written to disk. Serializes to JSON for database storage. The entry point for generated components is always `/App.jsx` or `/App.tsx`.

**JSX Transformer** (`src/lib/transform/jsx-transformer.ts`): Babel-based pipeline that converts JSX/TSX → executable JS, strips CSS imports, detects missing dependencies, and produces an import map with CDN URLs so the iframe can run npm packages without a bundler.

**Preview iframe** (`src/components/preview/PreviewFrame.tsx`): Sandboxed iframe that receives a generated HTML string containing the import map and blob-URL module graph. Hot-reloads on every file change.

**AI Tools** (`src/lib/tools/`): `str_replace_editor` and `file_manager` are the only tools Claude can call. They operate entirely on the in-memory VirtualFileSystem.

**System Prompt** (`src/lib/prompts/generation.tsx`): Instructs Claude to use Tailwind CSS, target `/App.jsx` as the entry point, and use `@/` import aliases for cross-file references.

### Database Schema

The database schema is defined in the `prisma/schema.prisma` file. Reference it anytime you need to understand the structure of data stored in the database. DO NOT USE ANY OTHER SOURCES.

### Authentication & Persistence

- JWT sessions managed in `src/lib/auth.ts`; verified in `src/middleware.ts`
- Anonymous usage is fully supported — auth is optional
- Projects stored in SQLite via Prisma; `messages` and `data` columns are JSON strings
- Server actions in `src/actions/` handle all DB access (RSC pattern)

### AI Model

Default model is `claude-haiku-4-5`. Configured in `src/lib/provider.ts`. Falls back to a mock provider if `ANTHROPIC_API_KEY` is not set.

## Testing

Tests use Vitest + React Testing Library, co-located in `__tests__` directories next to source files. The test setup is in `vitest.config.mts`.
