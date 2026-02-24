# Architecture

## System Overview

CV Maker follows a client-server architecture with a React frontend and FastAPI backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ LaTeX Editor │  │  PDF Preview │  │ AI Chat / Analysis   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Compile API  │  │   Chat API   │  │   User Data API      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│          │                │                                      │
│          ▼                ▼                                      │
│  ┌──────────────┐  ┌──────────────┐                             │
│  │LaTeX Compiler│  │ AWS Bedrock  │                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Components

| Component | Purpose |
|-----------|---------|
| `App.tsx` | Main application container, state management |
| `LatexEditor.tsx` | CodeMirror-based LaTeX editor |
| `PdfPreview.tsx` | PDF rendering and display |
| `ChatPanel.tsx` | AI conversation interface with edit suggestions |
| `MatchAnalysis.tsx` | CV-job match scoring display |
| `JobInput.tsx` | Job description input form |

### State Management

State is managed at the `App` component level using React hooks:

- `texContent` - Current LaTeX source
- `pdfBase64` - Compiled PDF as base64
- `messages` - Chat history
- `matchAnalysis` - Analysis results
- `editHistory` - For undo functionality

### Key Hooks

- `useApi` - Centralized API communication hook

## Backend Architecture

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/compile` | POST | Compile LaTeX to PDF |
| `/api/chat` | POST | Stream AI responses |
| `/api/match-analysis` | POST | Get CV-job match score |
| `/api/template` | GET | Load CV template |
| `/api/user-data` | GET/POST | User profile CRUD |
| `/api/health` | GET | Health check |

### Services

| Service | Purpose |
|---------|---------|
| `latex_compiler.py` | Handles LaTeX compilation via pdflatex |
| `cv_analyzer.py` | CV analysis and match scoring |
| `bedrock.py` | AWS Bedrock client wrapper |

### AI Integration

The application uses AWS Bedrock with Claude models for:
1. **CV Analysis** - Analyzing CV content against job requirements
2. **Suggestions** - Generating improvement suggestions with inline edits
3. **Match Scoring** - Calculating CV-job compatibility scores

## Data Flow

### CV Edit Flow

```
User edits LaTeX → Frontend state updates → Compile request →
Backend compiles → PDF returned → Frontend displays
```

### AI Analysis Flow

```
User submits job description → Backend streams AI response →
Frontend displays streaming content → AI suggests edits →
User clicks apply → LaTeX updated → Previous state saved for undo
```

## File Structure

### Frontend (`/frontend/src`)

```
src/
├── components/
│   ├── ChatPanel.tsx      # AI conversation UI
│   ├── JobInput.tsx       # Job description input
│   ├── LatexEditor.tsx    # Code editor
│   ├── MatchAnalysis.tsx  # Match score display
│   ├── PdfPreview.tsx     # PDF viewer
│   └── index.ts           # Component exports
├── hooks/
│   └── useApi.ts          # API communication
├── types/
│   └── index.ts           # TypeScript definitions
├── App.tsx                # Main app component
├── App.css                # App styles
└── main.tsx               # Entry point
```

### Backend (`/backend`)

```
backend/
├── routes/
│   ├── chat.py            # Chat/AI endpoints
│   ├── compile.py         # LaTeX compilation
│   └── user_data.py       # User data management
├── services/
│   ├── bedrock.py         # AWS Bedrock client
│   ├── cv_analyzer.py     # CV analysis logic
│   └── latex_compiler.py  # LaTeX compilation
├── prompts/
│   └── cv_agent.py        # AI prompt templates
└── main.py                # FastAPI app entry
```

## Security Considerations

- CORS configured for local development only
- No authentication currently implemented
- User data stored locally in JSON files
- AWS credentials managed via environment/IAM
