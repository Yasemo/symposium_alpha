
# Symposium User Flow

## 1. Authentication & Initial Setup
- User lands on login page
- Signs up/logs in with email and password
- Optionally adds OpenRouter API key for LLM access
- Redirected to main SPA interface

## 2. Main Interface Layout (Three-Panel Design)

### Left Sidebar: Project Management Hub
- **Projects Tab**: List of user's projects with create/edit options
- **Objectives Tab**: Shows objectives for selected project
- **Tasks Tab**: Shows task sequences for selected objective
- All with drag-and-drop reordering capabilities

### Center Panel: Chat Interface
- **Chat Messages**: Conversation history for currently selected objective
- **Message Input**: Text area for user messages
- **Tag Selector**: Choose which knowledge base tags to include in context
- **Consultant Panel**: Select and configure 3rd party integrations
- **Model Selector**: Choose OpenRouter LLM model for responses
- **Credit Display**: Show remaining OpenRouter credits

### Right Sidebar: Knowledge Base
- **Content Cards**: Markdown-rendered cards with show/hide toggles
- **Tags Management**: Create, edit, assign tags to cards
- **Search/Filter**: Find specific cards or tags quickly

## 3. Project Creation Flow

### Option A: Manual Creation
1. Click "New Project" in left sidebar
2. Enter project title and description
3. Project appears in projects list
4. Can manually add objectives and tasks

### Option B: LLM-Generated Creation
1. Click "Generate Project" 
2. Enter project description/idea
3. Select OpenRouter model
4. LLM generates structured preview:
   - Project title and description
   - Multiple objectives with titles/descriptions
   - Task sequences for each objective
5. User reviews preview, can add revision instructions
6. Can regenerate with modifications
7. Accept to create full project structure

## 4. Project Structure Management

### Project Level
- Title and description editing
- Overview of all objectives
- Project-wide settings

### Objective Level  
- Create/edit objective title and description
- View and reorder associated tasks
- Each objective has its own isolated chat history

### Task Level
- Create/edit task title and description
- Drag to reorder within objective sequence
- Toggle completion status
- Tasks show sequence numbers (1, 2, 3...)

## 5. Chat & LLM Interaction Flow

### Selecting Context
1. User clicks on an objective in left sidebar
2. Chat panel switches to that objective's message history
3. Task sequence for that objective becomes visible

### Preparing a Message
1. User types message in chat input
2. Selects relevant tags from knowledge base (optional)
3. Chooses consultant integration (optional)
4. Selects OpenRouter model
5. System constructs Global System Prompt containing:
   - Current project title/description
   - Selected objective title/description  
   - All tasks in sequence with completion status
   - Chat history for this objective
   - Content cards matching selected tags (if not hidden)
   - User's new message

### Sending & Response
1. User sends message
2. Global System Prompt + user message sent to selected LLM
3. Assistant response added to objective's chat history
4. User can continue conversation in this context

### Message Management
- Toggle any message as "hidden" to exclude from future prompts
- **Delete messages permanently** from database (not just hide)
- Convert assistant or consultant messages to content cards
- **Message-to-card conversion creates independent content** (fully decoupled)
- Messages remain tied to their specific objective

## 6. Knowledge Base Workflow

### Content Card Creation
1. **From Scratch**: Create new card with title and markdown content
2. **From Message**: Convert any chat message (assistant or consultant) to a reusable card
3. **All cards start hidden** to prevent prompt bloat
4. **Complete Decoupling**: Once converted, content card is independent of original message

### Content Card Management
- Edit title and markdown content
- Toggle visibility (hidden/visible)
- Add/remove tags
- **Delete permanently** from knowledge base

### Tag System
1. Create tags with names and colors
2. Assign multiple tags to content cards
3. Use tags in chat to include relevant cards in prompts
4. **Delete tags** (removes from all associated cards)
5. **Tag Override Rule**: If a tag is selected in chat, even hidden cards with that tag get included

### Content Card Visibility Rules
- **Hidden cards**: Excluded from Global System Prompt by default
- **Visible cards**: Always included in Global System Prompt
- **Tagged cards in chat**: Included regardless of hidden status when tag is active

### Knowledge Base Scope
- **Global Scope**: Available across ALL user's projects, not just current project
- Cards and tags persist and can be reused in any project context

## 7. Consultant Integration Flow

### Setup & Management
1. Click "Manage Consultants" in chat area
2. See list of available consultant types (built by developer)
3. Click "Add" next to desired consultant (e.g., Airtable, Notion, etc.)
4. Configure consultant with API credentials/settings
5. Consultant appears as **tab** in chat interface

### Using Consultants
1. **Click consultant tab** in chat area
2. **Messages area gets covered** by consultant's custom interface
3. User interacts with consultant-specific UI:
   - Airtable: Select base, table, build query
   - Other consultants: Their unique interaction patterns
4. User executes the consultant query/action
5. **Interface disappears** automatically
6. **API response formatted as markdown** and added as message to chat
7. Consultant message appears in chat history with clear attribution

### Consultant vs Chat Assistant
- **Two separate systems** both outputting to same message thread
- **Chat Assistant**: LLM conversations using Global System Prompt
- **Consultants**: 3rd party API interactions with custom UIs
- **Both message types**: Can be hidden, deleted, or converted to content cards
- **Message deletion**: Permanently removes from database, not just from prompt

## 8. Token Management Strategy

### Visibility Controls
- Hide/show individual messages
- Hide/show content cards
- Select only relevant tags for current conversation

### Smart Inclusion
- Only selected objective's context included (not all projects)
- Only relevant tagged content cards included
- Task sequences show completion status for context

### Credit Monitoring
- OpenRouter credit balance displayed
- Model selection affects token costs
- Users encouraged to be strategic with context inclusion

## 9. Cross-Objective Navigation

### Context Switching
1. User clicks different objective in left sidebar
2. Chat panel immediately switches to that objective's history
3. Task sequence updates to show that objective's tasks
4. Any active tags remain selected but apply to new context
5. Global System Prompt rebuilds for new objective context

### Knowledge Base Consistency
- Content cards and tags available **across ALL user projects** (global scope)
- Same knowledge base serves all projects and objectives
- Cards maintain visibility settings across all contexts
- Can delete cards and tags permanently from knowledge base

## 10. Typical User Session

1. **Login** and see project dashboard
2. **Select existing project** or create/generate new one
3. **Choose objective** to work on
4. **Review task sequence** and mark completed items
5. **Select relevant tags** from knowledge base for context
6. **Chat with AI** about current objective using full context
7. **Use consultant** to pull in external data if needed
8. **Convert useful responses** to content cards for reuse
9. **Switch between objectives** as needed, each with own chat history
10. **Manage knowledge base** by creating/tagging new content cards

This flow emphasizes the app's core value: providing rich, contextual AI conversations that stay organized by objective while maintaining a reusable knowledge base across the entire ideation process.


# Symposium Web App Blueprint

## High-Level Directory Structure

```
symposium/
├── src/
│   ├── server/
│   │   ├── main.ts                 # Deno server entry point
│   │   ├── routes/
│   │   │   ├── auth.ts            # Authentication routes
│   │   │   ├── projects.ts        # Project CRUD operations
│   │   │   ├── objectives.ts      # Objective CRUD operations
│   │   │   ├── tasks.ts           # Task CRUD operations
│   │   │   ├── messages.ts        # Chat message operations
│   │   │   ├── knowledge.ts       # Content cards & tags
│   │   │   ├── consultants.ts     # Consultant integrations
│   │   │   ├── llm.ts            # LLM API proxy routes
│   │   │   └── openrouter.ts     # OpenRouter credit & model info
│   │   ├── middleware/
│   │   │   ├── auth.ts            # Authentication middleware
│   │   │   ├── cors.ts            # CORS handling
│   │   │   └── validation.ts      # Request validation
│   │   ├── database/
│   │   │   ├── schema.sql         # Database schema
│   │   │   ├── migrations/        # Database migrations
│   │   │   └── connection.ts      # SQLite connection setup
│   │   └── services/
│   │       ├── llm-service.ts     # LLM interaction logic
│   │       ├── openrouter.ts      # OpenRouter API client
│   │       ├── consultants/       # Consultant implementations
│   │       │   ├── base.ts        # Base consultant interface
│   │       │   ├── airtable.ts    # Airtable consultant
│   │       │   └── index.ts       # Consultant registry
│   │       └── prompt-builder.ts  # Global System Prompt construction
│   ├── client/
│   │   ├── index.html             # Main SPA entry point
│   │   ├── styles/
│   │   │   ├── main.css           # Global styles
│   │   │   ├── components/        # Component-specific styles
│   │   │   └── variables.css      # CSS custom properties
│   │   ├── scripts/
│   │   │   ├── main.js            # Client app initialization
│   │   │   ├── components/        # UI components
│   │   │   │   ├── sidebar-left.js   # Project/Objective/Task management
│   │   │   │   ├── chat-area.js      # Chat interface
│   │   │   │   ├── sidebar-right.js  # Knowledge base
│   │   │   │   ├── modal.js          # Modal dialogs
│   │   │   │   └── drag-drop.js      # Drag & drop for task sequences
│   │   │   ├── services/
│   │   │   │   ├── api.js            # API client
│   │   │   │   ├── state.js          # Client state management
│   │   │   │   └── websocket.js      # Real-time updates (optional)
│   │   │   └── utils/
│   │   │       ├── markdown.js       # Markdown rendering
│   │   │       └── helpers.js        # Utility functions
│   │   └── assets/
│   │       ├── icons/
│   │       └── images/
├── config/
│   ├── database.ts                # Database configuration
│   └── environment.ts             # Environment variables
├── docker/
│   ├── Dockerfile                 # Container configuration
│   └── docker-compose.yml         # Local development setup
├── deno.json                      # Deno configuration
└── README.md
```

## Database Schema (SQLite)

### Core Entities

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    openrouter_api_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Objectives table
CREATE TABLE objectives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sequence_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tasks table
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    objective_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    sequence_order INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Chat messages table (per objective)
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    objective_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'consultant')),
    content TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE,
    model_used TEXT, -- For assistant messages
    consultant_type TEXT, -- For consultant messages (e.g., 'airtable')
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE
);

-- Tags table (global scope across all user projects)
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT, -- Hex color for UI
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- Content cards table (global scope across all user projects)
CREATE TABLE content_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Markdown content
    is_hidden BOOLEAN DEFAULT TRUE, -- Always starts hidden
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- Note: No reference to source message - fully decoupled after conversion
);

-- Many-to-many relationship: content cards to tags
CREATE TABLE content_card_tags (
    content_card_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (content_card_id, tag_id),
    FOREIGN KEY (content_card_id) REFERENCES content_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Active chat tags (per objective)
CREATE TABLE objective_active_tags (
    objective_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (objective_id, tag_id),
    FOREIGN KEY (objective_id) REFERENCES objectives(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- User's active consultants (only consultants they've added appear as tabs)
CREATE TABLE user_consultants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    consultant_type TEXT NOT NULL, -- 'airtable', 'notion', etc.
    config_data TEXT NOT NULL, -- JSON configuration (API keys, settings)
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, consultant_type) -- User can only have one config per consultant type
);

-- Indexes for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_objectives_project_id ON objectives(project_id);
CREATE INDEX idx_tasks_objective_id ON tasks(objective_id);
CREATE INDEX idx_messages_objective_id ON messages(objective_id);
CREATE INDEX idx_content_cards_user_id ON content_cards(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
```

## API Routes Structure

### Authentication Routes (`/auth`)
- `POST /auth/login` - User login
- `POST /auth/register` - User registration  
- `POST /auth/logout` - User logout
- `GET /auth/me` - Get current user info

### Project Management (`/api`)
- `GET /api/projects` - Get user's projects
- `POST /api/projects` - Create project (manual or LLM-generated)
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/generate` - Generate project with LLM

### Objective Management
- `GET /api/projects/:projectId/objectives` - Get project objectives
- `POST /api/projects/:projectId/objectives` - Create objective
- `PUT /api/objectives/:id` - Update objective
- `DELETE /api/objectives/:id` - Delete objective
- `PUT /api/objectives/:id/reorder` - Reorder objectives

### Task Management
- `GET /api/objectives/:objectiveId/tasks` - Get objective tasks
- `POST /api/objectives/:objectiveId/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/complete` - Toggle task completion
- `PUT /api/objectives/:objectiveId/tasks/reorder` - Reorder tasks

### Chat & Messages
- `GET /api/objectives/:objectiveId/messages` - Get chat history
- `POST /api/objectives/:objectiveId/messages` - Send message to LLM
- `PUT /api/messages/:id/hide` - Toggle message visibility
- `DELETE /api/messages/:id` - Permanently delete message from database
- `POST /api/messages/:id/to-card` - Convert message to content card (creates decoupled card)

### Knowledge Base (Global Scope)
- `GET /api/content-cards` - Get user's content cards (across all projects)
- `POST /api/content-cards` - Create content card
- `PUT /api/content-cards/:id` - Update content card
- `DELETE /api/content-cards/:id` - Permanently delete content card
- `PUT /api/content-cards/:id/hide` - Toggle card visibility

### Tags (Global Scope)
- `GET /api/tags` - Get user's tags (across all projects)
- `POST /api/tags` - Create tag
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Permanently delete tag (removes from all cards)
- `POST /api/content-cards/:cardId/tags` - Add tags to card
- `DELETE /api/content-cards/:cardId/tags/:tagId` - Remove tag from card

### Chat Tag Management
- `GET /api/objectives/:objectiveId/active-tags` - Get active tags for objective
- `POST /api/objectives/:objectiveId/active-tags` - Set active tags for objective

### Consultants
- `GET /api/consultants` - Get available consultant types (built by developer)
- `GET /api/consultants/user` - Get user's active consultants (appear as tabs)
- `POST /api/consultants/user` - Add consultant to user's account
- `PUT /api/consultants/user/:id` - Update consultant configuration
- `DELETE /api/consultants/user/:id` - Remove consultant from user's account
- `POST /api/consultants/:type/execute` - Execute consultant query (returns message to chat)

### LLM & OpenRouter
- `GET /api/openrouter/models` - Get available models
- `GET /api/openrouter/credits` - Get user's credit balance
- `POST /api/llm/chat` - Send chat completion request
- `POST /api/llm/generate-project` - Generate project structure

## Key Components & Services

### Global System Prompt Builder
```typescript
interface GlobalSystemPromptContext {
    project: { title: string; description: string };
    objective: { title: string; description: string };
    tasks: Array<{ title: string; description: string; sequence: number; completed: boolean }>;
    chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    contentCards: Array<{ title: string; content: string }>;
    userMessage: string;
}
```

### State Management Strategy
- **Server**: Completely stateless, all state in SQLite
- **Client**: Minimal state management for UI interactions
- **Real-time**: Optional WebSocket for multi-user scenarios

### Consultant Interface
```typescript
interface Consultant {
    type: string;
    name: string;
    description: string;
    configSchema: any; // JSON Schema for configuration UI
    execute(config: any, query: any): Promise<string>; // Returns markdown message
    renderInterface(config: any): HTMLElement; // Custom UI overlay
}

interface ConsultantMessage {
    role: 'consultant';
    content: string; // Markdown formatted API response
    consultant_type: string;
    created_at: string;
}
```

## Technology Stack Summary

**Backend:**
- **Runtime**: Deno with TypeScript
- **Database**: SQLite with migrations
- **Authentication**: JWT tokens
- **LLM Integration**: OpenRouter API
- **Deployment**: Google Cloud Run + Cloud SQL

**Frontend:**
- **Languages**: Vanilla TypeScript, HTML5, CSS3
- **Architecture**: Single Page Application
- **State**: Minimal client-side state management
- **UI**: Custom components with drag & drop
- **Rendering**: Native markdown rendering

**Infrastructure:**
- **Containerization**: Docker
- **Cloud Platform**: Google Cloud Platform
- **Database**: Cloud SQL (SQLite compatible)
- **API Gateway**: Cloud Run built-in

This blueprint provides a solid foundation that's scalable, maintainable, and aligned with your stateless architecture requirements. Would you like me to dive deeper into any specific component or start with the implementation of particular modules?