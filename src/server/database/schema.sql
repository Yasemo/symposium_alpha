-- Symposium Database Schema
-- SQLite database for the Symposium application

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
CREATE INDEX idx_objectives_sequence ON objectives(project_id, sequence_order);
CREATE INDEX idx_tasks_objective_id ON tasks(objective_id);
CREATE INDEX idx_tasks_sequence ON tasks(objective_id, sequence_order);
CREATE INDEX idx_messages_objective_id ON messages(objective_id);
CREATE INDEX idx_messages_created_at ON messages(objective_id, created_at);
CREATE INDEX idx_content_cards_user_id ON content_cards(user_id);
CREATE INDEX idx_content_cards_hidden ON content_cards(user_id, is_hidden);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_user_consultants_user_id ON user_consultants(user_id);
CREATE INDEX idx_user_consultants_active ON user_consultants(user_id, is_active);
