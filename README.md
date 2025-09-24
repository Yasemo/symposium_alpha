# Symposium

A professional AI-powered project management platform with advanced UI features and modular architecture.

## 🚀 Features m

### 🎯 **Project Management**
- **Manual Project Creation**: Create projects with objectives and tasks
- **AI Project Generation**: Generate complete project structures using OpenRouter LLMs
- **Drag & Drop Task Reordering**: Intuitive task management with visual feedback
- **Project Navigation**: Seamless switching between projects, objectives, and tasks

### 🤖 **AI Integration**
- **OpenRouter LLM Support**: Multiple AI models (GPT-4, Claude, Llama, etc.)
- **Dynamic Model Selection**: Real-time model loading with pricing information
- **Context-Aware Conversations**: AI responses include full project context
- **Global System Prompt**: Intelligent context building from projects, tasks, and knowledge base

### 📚 **Knowledge Base**
- **Content Cards**: Markdown-based knowledge management
- **Tag System**: Organize content with colored tags
- **Search & Filter**: Real-time content discovery
- **Visibility Control**: Hide/show cards from AI prompts while keeping them visible in UI
- **Message-to-Card Conversion**: Convert AI responses to reusable knowledge

### 🎨 **Advanced UI**
- **Professional Notifications**: Toast system with progress bars and animations
- **Modular Components**: Clean, maintainable component architecture
- **Responsive Design**: Works across different screen sizes
- **Smooth Animations**: Professional transitions and hover effects
- **Dark Theme Ready**: CSS variables for easy theming

## 🏗️ Architecture

### **Modular Component System**
- **Chat Area Component**: Message handling, model selection, API key management
- **Modal Manager**: Dynamic forms with validation and user experience features
- **Sidebar Components**: Project management (left) and knowledge base (right)
- **Lightweight Coordinator**: Main app handles only authentication and initialization

### **Technology Stack**
- **Backend**: Deno + TypeScript + Oak framework
- **Database**: SQLite with comprehensive schema
- **Frontend**: Vanilla JavaScript with modular components
- **Styling**: CSS with custom properties and professional design
- **Authentication**: JWT tokens with secure middleware

## 🚀 Quick Start

### Prerequisites
- [Deno](https://deno.land/) installed on your system
- OpenRouter API key (optional, for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yasemo/symposium.git
   cd symposium
   ```

2. **Start the development server**
   ```bash
   deno task dev
   ```

3. **Open your browser**
   Navigate to `http://localhost:8000`

### First Time Setup

1. **Create an account** using the registration form
2. **Add your OpenRouter API key** (optional) for AI features
3. **Create your first project** manually or generate one with AI
4. **Start organizing** your work with objectives and tasks
5. **Build your knowledge base** with content cards and tags

## 📖 Usage

### Project Management
1. **Create Projects**: Use the "New" button or "Generate" with AI
2. **Add Objectives**: Break down projects into manageable objectives
3. **Create Tasks**: Add specific tasks to each objective
4. **Reorder Tasks**: Drag and drop to prioritize work
5. **Track Progress**: Check off completed tasks

### AI Conversations
1. **Select an Objective**: Click on an objective to start chatting
2. **Choose AI Model**: Select from available OpenRouter models
3. **Include Context**: Select relevant tags to include knowledge base content
4. **Send Messages**: Have contextual conversations with AI
5. **Save Responses**: Convert useful AI responses to content cards

### Knowledge Management
1. **Create Content Cards**: Add markdown-formatted knowledge
2. **Organize with Tags**: Create colored tags for categorization
3. **Control Visibility**: Hide cards from AI while keeping them visible in UI
4. **Search Content**: Find specific information quickly
5. **Reuse Knowledge**: Include tagged content in AI conversations

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=8000
JWT_SECRET=your-jwt-secret-here

# Database
DATABASE_PATH=./symposium.db

# OpenRouter (Optional)
OPENROUTER_API_URL=https://openrouter.ai/api/v1
```

### OpenRouter Setup
1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key from the dashboard
3. Add the key in the Symposium app settings
4. Start using AI features with various models

## 🏗️ Development

### Project Structure
```
symposium/
├── src/
│   ├── server/           # Deno backend
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Authentication & CORS
│   │   ├── services/     # Business logic
│   │   └── database/     # SQLite schema & connection
│   └── client/           # Frontend
│       ├── scripts/      # JavaScript components
│       ├── styles/       # CSS styling
│       └── index.html    # Main HTML file
├── config/               # Configuration files
├── docker/              # Container setup
└── deno.json            # Deno configuration
```

### Available Scripts
```bash
# Development server with auto-reload
deno task dev

# Production server
deno task start

# Database initialization
deno task db:init

# Run tests
deno task test
```

### Component Architecture
- **Separation of Concerns**: Each component manages its own domain
- **State Management**: Global state with reactive subscriptions
- **Event Handling**: Proper cleanup and memory management
- **Modular Design**: Easy to extend and maintain

## 🚀 Deployment

### Docker Deployment
```bash
# Build the container
docker build -t symposium .

# Run the container
docker run -p 8000:8000 symposium
```

### Manual Deployment
1. **Prepare the server** with Deno installed
2. **Clone the repository** to your server
3. **Set environment variables** for production
4. **Initialize the database** with `deno task db:init`
5. **Start the application** with `deno task start`

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenRouter** for providing access to multiple LLM models
- **Deno** for the modern TypeScript runtime
- **Oak** for the web framework
- **SQLite** for the reliable database

## 📞 Support

If you encounter any issues or have questions:

1. **Check the documentation** in this README
2. **Search existing issues** on GitHub
3. **Create a new issue** with detailed information
4. **Join the discussion** in GitHub Discussions

---

**Built with ❤️ using Deno, TypeScript, and modern web technologies.**
