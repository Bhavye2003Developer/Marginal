# Task 1 Brief: Project scaffold + environment setup

## Context
You are building Marginal — a personal single-user read-later web app. This is Task 1 of 13.
Working directory: C:\Users\Bhavye\Desktop\marginal
There is currently NO git repo. You will create it. The directory already has SPEC.md, CLAUDE.md, and docs/.

## What to build

**Files to create:**
- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs` (via create-next-app)
- `.env.local.example`
- `jest.config.ts`, `jest.setup.ts`
- `src/app/layout.tsx` (simplified, no nav yet — nav comes in Task 4)
- `src/app/page.tsx` (redirects to /library)

**Produces:** working `npm run build`, `npm test` (zero tests pass — that's fine, just no errors)

## Steps

### Step 1: Bootstrap Next.js into the current directory
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --yes
```
If it asks about overwriting existing files, say yes (only SPEC.md, CLAUDE.md, docs/ exist — these won't be touched by create-next-app).

### Step 2: Install runtime dependencies
```bash
npm install mongodb @aws-sdk/client-s3 @mozilla/readability jsdom zod pdfjs-dist@3.11.174
```

### Step 3: Install dev dependencies
```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom mongodb-memory-server @types/jsdom
```

### Step 4: Write `jest.config.ts`
```typescript
// jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEnv: ["./jest.setup.ts"],
};

export default config;
```
NOTE: `setupFilesAfterEnv` (not `setupFilesAfterFramework`) — the plan had a typo.

### Step 5: Write `jest.setup.ts`
```typescript
// jest.setup.ts
// placeholder — extended in later tasks
```

### Step 6: Write `.env.local.example`
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=marginal
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=marginal-pdfs
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

### Step 7: Replace `src/app/layout.tsx`
```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Marginal" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body>
    </html>
  );
}
```

### Step 8: Replace `src/app/page.tsx`
```tsx
// src/app/page.tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/library");
}
```

### Step 9: Verify build passes (do NOT start dev server — it blocks)
```bash
npm run build
```
Expected: build succeeds. Fix any TypeScript errors before committing.

Also run:
```bash
npx jest --passWithNoTests
```
Expected: exits 0 with "No tests found" or similar.

### Step 10: Init git and commit
```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with deps and jest config"
```

## Report
Write your full report to: C:\Users\Bhavye\Desktop\marginal\.superpowers\sdd\task-1-report.md

Include:
- Status: DONE | DONE_WITH_CONCERNS | BLOCKED
- Commits made (short hashes)
- `npm run build` result
- `npx jest --passWithNoTests` result
- Any concerns or deviations from the brief
