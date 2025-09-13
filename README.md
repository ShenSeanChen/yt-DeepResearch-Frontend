# 🎨 Deep Research Agent - Frontend

A modern, responsive Next.js frontend for the Deep Research Agent. Features real-time streaming research progress, multi-model support, and an intuitive chat-like interface similar to Perplexity and OpenAI's thinking mode.

## ✨ Features

- **Real-time Research Streaming**: Live updates showing AI thinking process and research steps
- **Multi-Model Support**: Switch between Claude 3.5 Sonnet, GPT-4o, and Kimi K2 (256K context)
- **Progressive Research Display**: Detailed step-by-step research progress with visual indicators
- **Google Docs Export**: One-click export to Google Docs with proper formatting and sources
- **Responsive Design**: Mobile-friendly and adaptive to all screen sizes
- **Persistent State**: Research results preserved when switching tabs
- **Source Linking**: Clickable sources from research findings
- **Model Comparison**: Compare performance metrics across different AI models
- **Smooth Animations**: Loading states, progress bars, and transition effects

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- Backend API running (see [Backend Setup](#-connecting-to-backend))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ShenSeanChen/yt-deepresearch-frontend.git
   cd yt-deepresearch-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure backend URL**
   ```bash
   # For local development (backend on localhost:8080)
   ./switch-env.sh local

   # For production (deployed backend)
   ./switch-env.sh production

   # Or manually create .env.local:
   echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8080" > .env.local
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Architecture

### Core Components

- **`app/page.tsx`**: Main page with ResearchProvider wrapper
- **`components/ResearchInterface.tsx`**: Core research UI with streaming
- **`contexts/ResearchContext.tsx`**: Global state management
- **`lib/utils.ts`**: Utility functions and helpers

### State Management

Uses React Context API for global state:
- Research messages and streaming events
- Current research stage and progress
- Model selection and API key management
- UI states (typing indicators, loading, etc.)

## 🔧 Environment Configuration

### Easy Environment Switching

Use the provided script to switch between local and production backends:

```bash
# Use local backend (localhost:8080)
./switch-env.sh local

# Use production backend
./switch-env.sh production

# Remove configuration (defaults to localhost:8080)
./switch-env.sh remove
```

### Manual Configuration

Create `.env.local` with your preferred backend URL:

```bash
# Local development
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# Production
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.run.app
```

### Environment Files

- `env.local.example`: Template for local development
- `env.production.example`: Template for production
- `switch-env.sh`: Script to easily switch configurations

## 🎨 UI Components

### Research Interface

- **Model Selection**: Dropdown to choose AI model (OpenAI, Anthropic, Kimi)
- **API Key Input**: Secure input for user's API key
- **Progress Bar**: Visual progress indicator during research
- **Live Indicator**: Shows when research is actively streaming
- **Research Steps**: Expandable cards showing detailed research process

### Research Progress Display

The interface shows detailed research steps:

1. **🎯 Planning**: Research strategy and source identification
2. **🔍 Queries**: Individual research queries being executed
3. **📊 Analysis**: Cross-referencing and analyzing findings
4. **🧠 Synthesis**: Combining findings into comprehensive analysis
5. **📋 Final Report**: Complete research report with sources

### Visual Elements

- **Color-coded Events**: Different colors for different types of research activities
- **Smooth Animations**: Entry animations for new research steps
- **Hover Effects**: Interactive elements with visual feedback
- **Responsive Design**: Adapts to mobile, tablet, and desktop screens

## 📄 Google Docs Export

The Deep Research Agent includes built-in Google Docs export functionality for seamless report sharing and collaboration.

### Export Options

**1. Copy to Clipboard** (Recommended)
- Click the "Copy for Docs" button when research is complete
- Content is copied to your clipboard with proper formatting
- Open Google Docs and paste directly (Ctrl+V / Cmd+V)

**2. Download & Import**
- Click the "Export" button to download a TXT file
- Go to [docs.google.com](https://docs.google.com)
- Create a new document
- Go to File > Open > Upload and select the downloaded file

### Export Content Includes

- **Research Query**: Original question/prompt
- **Metadata**: Generation timestamp and AI model used
- **Full Report**: Complete research findings with markdown formatting
- **Sources**: All referenced URLs and citations
- **Branding**: Deep Research Agent attribution

### Formatting Features

The exported content maintains:
- ✅ **Headers and Structure**: Proper heading hierarchy
- ✅ **Bold and Italic Text**: Emphasis formatting preserved
- ✅ **Numbered Lists**: Sequential information maintained
- ✅ **Source Links**: Clickable URLs for easy reference
- ✅ **Professional Layout**: Clean, readable document structure

### Usage Tips

1. **Best Practice**: Use "Copy for Docs" for fastest workflow
2. **Team Sharing**: Export to Google Docs for real-time collaboration
3. **Archive**: Save important research to Google Drive automatically
4. **Formatting**: Google Docs will auto-detect and enhance markdown formatting

## 🔗 Connecting to Backend

### Backend Requirements

The frontend expects a backend with these endpoints:

- `GET /health` - Health check
- `POST /research/stream` - Streaming research endpoint

### Backend URL Configuration

The frontend automatically detects the backend URL:

1. **Environment Variable**: `NEXT_PUBLIC_BACKEND_URL`
2. **Default Fallback**: `http://localhost:8080`

### Streaming Protocol

The frontend expects Server-Sent Events (SSE) with these event types:

```typescript
interface StreamingEvent {
  type: string                    // Event type (session_start, research_step, etc.)
  stage?: string                  // Research stage (clarification, research_brief, etc.)
  content?: string                // Event content/message
  timestamp: string               // ISO timestamp
  research_id?: string            // Unique research session ID
  model?: string                  // AI model being used
  error?: string                  // Error message if applicable
  node_name?: string              // LangGraph node name
  node_count?: number             // Node execution count
  duration?: number               // Event duration
}
```

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

### Mobile Features

- Touch-friendly interface
- Optimized spacing and typography
- Collapsible sections for better space usage
- Swipe gestures for navigation

## 🧪 Testing

### Development Testing

```bash
# Start development server
npm run dev

# Test with local backend
./switch-env.sh local
# Visit http://localhost:3000

# Test with production backend
./switch-env.sh production
# Visit http://localhost:3000
```

### Build Testing

```bash
# Build for production
npm run build

# Test production build
npm start
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   In Vercel dashboard, add:
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.run.app
   ```

### Manual Deployment

```bash
# Build the application
npm run build

# Export static files (if needed)
npm run export

# Deploy the 'out' directory to your hosting provider
```

## 🎯 Usage Guide

### Basic Research Flow

1. **Select AI Model**: Choose from OpenAI GPT-4o, Anthropic Claude, or Kimi K2
2. **Enter API Key**: Provide your API key for the selected model
3. **Ask Question**: Type your research question
4. **Watch Progress**: See real-time research steps and findings
5. **Review Results**: Read the comprehensive final report

### Advanced Features

- **Expand Steps**: Click on research steps to see detailed content
- **Source Links**: Click on sources to visit original content
- **Progress Tracking**: Monitor research progress with the progress bar
- **Error Handling**: Automatic retry suggestions for failed requests

## 🗄️ Database Integration (Optional)

The Deep Research Agent supports optional database integration for persistent research history and advanced model comparison tracking.

### Supabase Integration

**Why Add Database?**
- 📊 **Research History**: Save and review past research sessions
- 📈 **Model Performance Tracking**: Compare model speed, accuracy, and quality over time
- 🔄 **Session Persistence**: Resume research sessions across devices
- 📊 **Analytics Dashboard**: Track usage patterns and research topics

**Setup Instructions:**

1. **Create Supabase Project**
   ```bash
   # Visit https://supabase.com and create a new project
   # Note your project URL and anon key
   ```

2. **Database Schema**
   ```sql
   -- Research sessions table
   CREATE TABLE research_sessions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     query TEXT NOT NULL,
     model VARCHAR(50) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     completed_at TIMESTAMP,
     duration_seconds INTEGER,
     final_report TEXT,
     sources JSONB,
     stage_timings JSONB,
     success BOOLEAN DEFAULT FALSE
   );

   -- Model performance metrics
   CREATE TABLE model_metrics (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     model VARCHAR(50) NOT NULL,
     avg_duration FLOAT,
     success_rate FLOAT,
     total_runs INTEGER,
     last_updated TIMESTAMP DEFAULT NOW()
   );
   ```

3. **Environment Variables**
   ```bash
   # Add to .env.local
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Install Dependencies**
   ```bash
   npm install @supabase/supabase-js
   ```

**Benefits of Database Integration:**
- ✅ **Persistent History**: Never lose research results
- ✅ **Performance Analytics**: Track which models work best for different query types
- ✅ **Team Collaboration**: Share research sessions with team members
- ✅ **Usage Insights**: Understand research patterns and optimize workflows

**Note**: Database integration is completely optional. The app works perfectly without it, but adding it unlocks powerful analytics and persistence features.

## 🔒 Security

- **API Keys**: Never stored client-side, sent directly to backend
- **HTTPS**: Enforced in production
- **Input Validation**: Client-side validation for all inputs
- **CORS**: Configured for secure cross-origin requests
- **Database Security**: Supabase RLS (Row Level Security) recommended for multi-user setups

## 🐛 Troubleshooting

### Common Issues

1. **Backend Connection Failed**
   - Check backend URL in `.env.local`
   - Verify backend is running and accessible
   - Check CORS configuration

2. **API Key Errors**
   - Verify API key is correct for selected model
   - Check API key permissions and quotas
   - Ensure model is supported by your API key

3. **Streaming Issues**
   - Check network connectivity
   - Verify browser supports Server-Sent Events
   - Check for ad blockers or network filters

### Debug Mode

Enable debug logging:
```javascript
// In browser console
localStorage.setItem('debug', 'true')
```

## 🛠️ Development

### Project Structure

```
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React components
│   ├── ResearchInterface.tsx
│   └── ui/               # UI components
├── contexts/             # React contexts
│   └── ResearchContext.tsx
├── lib/                  # Utilities
│   └── utils.ts
├── env.*.example         # Environment templates
└── switch-env.sh         # Environment switching script
```

### Key Dependencies

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Radix UI**: Accessible components
- **Lucide React**: Icons

### Code Style

- **Google Standards**: Code comments and formatting
- **TypeScript**: Strict type checking
- **ESLint**: Code linting
- **Prettier**: Code formatting

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow Google coding standards
4. Add comments to all code
5. Test on mobile and desktop
6. Submit a pull request

## 📞 Support

- Create an issue for bugs or feature requests
- Check browser console for error messages
- Verify backend connectivity first
- Review environment configuration

---

Built with ❤️ using Next.js, TypeScript, and Tailwind CSS.