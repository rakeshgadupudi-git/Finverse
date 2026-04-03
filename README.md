# FinTracker

FinTracker has been successfully refactored from a Next.js (TypeScript/Tailwind) monolith into a modern, separated frontend/backend architecture using JavaScript and Vanilla CSS.

## Architecture

*   **Frontend**: React, Vite, Vanilla CSS. Located in \`frontend/\`.
*   **Backend**: Node.js, Express. Located in \`backend/\`.

## Getting Started

### Prerequisites

Ensure you have Node.js installed.

### Setup and Running

You can use the convenience scripts in the root directory to run both environments simultaneously (if your shell supports \`&\`), or you can run them separately using multiple terminals.

#### Option 1 (Single terminal):
\`\`\`bash
cd d:/FS_Project
# If it's a bash/unix-like shell:
npm run dev
\`\`\`

#### Option 2 (Two terminals):

**Terminal 1 — Backend:**
\`\`\`bash
cd d:/FS_Project/backend
npm start
\`\`\`
The backend server will run on port 5000.

**Terminal 2 — Frontend:**
\`\`\`bash
cd d:/FS_Project/frontend
npm run dev
\`\`\`
The frontend server will run on port 5173.

## Phase 2 Placeholders

The newly added architecture supports models, database schemas, and repositories. Placeholders have been set up in \`backend/src/models\`, \`backend/src/database\`, and \`backend/src/repositories\` for the future integration of a real database. Currently, all data is served via memory mock data through the Express REST endpoints exactly matching the old Next.js App routes.
