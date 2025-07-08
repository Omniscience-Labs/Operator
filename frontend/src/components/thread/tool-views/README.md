# Tool Views System

A comprehensive, beautiful UI system for displaying AI agent tool executions in the Operator AI interface.

## 🎯 Overview

Tool views transform raw agent tool outputs into rich, interactive displays that provide users with meaningful insights into agent operations. Each tool view follows established design patterns for consistency, aesthetics, and usability.

## 📁 Directory Structure

```
tool-views/
├── README.md                           # This overview (you are here)
├── IMPLEMENTATION_GUIDE.md             # Step-by-step implementation guide
├── TODO.md                            # Unimplemented tool views roadmap
├── types.ts                           # Shared TypeScript interfaces
├── utils.ts                           # Common utility functions
├── tool-result-parser.ts              # Tool result parsing utilities
├── xml-parser.ts                      # XML format parsing utilities
│
├── wrapper/                           # Core system components
│   ├── ToolViewRegistry.tsx           # Central tool-to-component mapping
│   ├── ToolViewWrapper.tsx            # Component wrapper logic
│   └── index.ts                       # Registry exports
│
├── shared/                            # Reusable UI components
│   ├── LoadingState.tsx               # Loading animations
│   ├── ImageLoader.tsx                # Image loading with fallbacks
│   └── [other shared components]
│
├── [specific-tool]/                   # Individual tool implementations
│   ├── ToolNameToolView.tsx           # Main component
│   ├── _utils.ts                      # Tool-specific utilities
│   ├── index.ts                       # Export declarations
│   └── README.md                      # Tool-specific documentation
│
└── GenericToolView.tsx                # Fallback for unimplemented tools
```

## 🛠️ Implemented Tool Views

### ✅ Completed Tools

| Tool Category | Tool View | Status | Theme | Features |
|--------------|-----------|---------|-------|----------|
| **Knowledge & Search** | Knowledge Search | ✅ Complete | Purple | Score-based ranking, expandable results, metadata extraction |
| **File Operations** | File Operations | ✅ Complete | Green | Syntax highlighting, diff views, file previews |
| **Web Operations** | Web Search | ✅ Complete | Blue | Result clustering, image galleries, source validation |
| **Web Operations** | Web Scraping | ✅ Complete | Blue | Content preview, extraction rules, data quality |
| **Browser Automation** | Browser Actions | ✅ Complete | Cyan | Screenshot overlays, action sequences, real-time updates |
| **System Commands** | Command Execution | ✅ Complete | Gray | Terminal output, exit codes, command history |
| **Data Operations** | Excel Operations | ✅ Complete | Orange | Table rendering, sheet management, data visualization |
| **User Interaction** | Ask User | ✅ Complete | Blue | Interactive forms, file attachments, validation |
| **Task Management** | Task Complete | ✅ Complete | Green | Progress tracking, deliverable lists, success metrics |
| **API Integration** | Data Providers | ✅ Complete | Orange | Request/response formatting, status codes, rate limits |
| **Deployment** | Deploy Operations | ✅ Complete | Green | Build logs, deployment status, URL generation |
| **Visual Content** | Image Viewing | ✅ Complete | Purple | Image galleries, zoom controls, metadata display |

### 🔧 High Priority (Next to Implement)

| Tool Category | Tool View | Priority | Estimated Effort | Key Features |
|--------------|-----------|----------|------------------|--------------|
| **MCP Tools** | Enhanced MCP | 🔥 High | Medium | Server branding, tool-specific formatting, connection status |
| **Audio/Media** | Audio Transcription | 🔥 High | Medium | Waveform visualization, timestamp sync, speaker ID |
| **Documents** | PDF Form Handling | 🔥 High | Medium | Form field preview, validation status, completion tracking |
| **System** | Computer Use | 🔥 High | Complex | Screenshot annotations, action visualization, coordinate tracking |
| **Agent Management** | Agent Updates | 🔥 High | Medium | Configuration diffs, before/after comparison, tool status |

See [`TODO.md`](./TODO.md) for the complete roadmap.

## 🎨 Design System

### Color Themes by Category

```scss
// Knowledge & AI Tools
$purple-theme: {
  primary: "purple-500",
  background: "purple-50/80",
  border: "purple-200/50"
}

// Web & Communication Tools  
$blue-theme: {
  primary: "blue-500",
  background: "blue-50/80", 
  border: "blue-200/50"
}

// File & System Tools
$green-theme: {
  primary: "emerald-500",
  background: "emerald-50/80",
  border: "emerald-200/50"
}

// Data & Infrastructure Tools
$orange-theme: {
  primary: "orange-500", 
  background: "orange-50/80",
  border: "orange-200/50"
}

// System & Automation Tools
$gray-theme: {
  primary: "zinc-500",
  background: "zinc-50/80",
  border: "zinc-200/50"
}
```

### Component Architecture

```typescript
interface ToolViewComponent {
  // Standardized header with icon, title, and status
  header: {
    icon: LucideIcon;
    title: string;
    status: 'success' | 'error' | 'loading';
    theme: ColorTheme;
  };
  
  // Main content area with results
  content: {
    loading: LoadingState;
    results: ResultsDisplay;
    empty: EmptyState;
  };
  
  // Footer with metadata and timing
  footer: {
    metadata: ResultMetadata;
    timestamp: string;
  };
}
```

## 🚀 Quick Start

### For Users
Tool views automatically display when agents use tools. No configuration needed - the system detects tool types and renders appropriate views.

### For Developers

1. **View existing implementations** in [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md)
2. **Pick a tool** from [`TODO.md`](./TODO.md) high-priority list  
3. **Follow the guide** step-by-step to create new tool views
4. **Test thoroughly** in both light and dark modes
5. **Update documentation** and registry when complete

### Creating a New Tool View

```bash
# 1. Create tool directory
mkdir frontend/src/components/thread/tool-views/my-tool

# 2. Follow the implementation guide
# See IMPLEMENTATION_GUIDE.md for detailed steps

# 3. Register in ToolViewRegistry.tsx
import { MyToolView } from '../my-tool/MyToolView';
const registry = {
  'my-tool': MyToolView,
  // ...
};
```

## 📊 System Features

### 🎯 Dynamic Registration
- **Pattern-based routing** (e.g., `search_*` → KnowledgeSearchToolView)
- **Automatic fallbacks** to GenericToolView for unimplemented tools
- **Hot-swappable** tool view components

### 🔍 Data Processing
- **Multi-format parsing** supporting various tool output formats
- **Robust error handling** with graceful degradation
- **Type-safe interfaces** with comprehensive TypeScript support
- **Standardized utilities** for common data extraction patterns

### 🎨 Visual Consistency
- **Theme-based color systems** for different tool categories
- **Consistent spacing** and typography throughout
- **Dark/light theme support** with proper contrast ratios
- **Responsive layouts** that work on all screen sizes

### ⚡ Performance
- **Lazy loading** for heavy content and images
- **Virtual scrolling** for large datasets (where implemented)
- **Optimized re-renders** with proper React patterns
- **Memory-efficient** state management

### ♿ Accessibility
- **Semantic HTML** structure throughout
- **Keyboard navigation** support
- **Screen reader compatibility** with proper ARIA labels
- **WCAG 2.1 compliance** for color contrast and readability

## 🔧 Advanced Usage

### Custom Tool Registration

```typescript
// Register multiple tools to one view
const registry = {
  'tool-variant-1': MyToolView,
  'tool-variant-2': MyToolView,
  'tool-variant-3': MyToolView,
};

// Register with pattern matching
toolViewRegistry.register('search_*', KnowledgeSearchToolView);
```

### Theme Customization

```typescript
// Override theme colors for specific tools
const customTheme = {
  primary: 'indigo-500',
  background: 'indigo-50/80',
  border: 'indigo-200/50',
};
```

### Data Processing Extensions

```typescript
// Extend common utilities for specific tool needs
export function extractMyToolData(content: any): MyToolData {
  const baseData = extractToolData(content);
  // Add tool-specific processing
  return processedData;
}
```

## 📈 Metrics & Analytics

### Tool Usage Tracking
- **View render counts** per tool type
- **User interaction patterns** (expansions, clicks)
- **Performance metrics** (render times, data processing)
- **Error rates** and failure modes

### Quality Metrics
- **Visual consistency scores** across tool views
- **Accessibility compliance** testing results
- **User satisfaction** feedback on tool displays
- **Development velocity** for new tool implementations

## 🤝 Contributing

### Development Workflow
1. **Pick from TODO list** - Start with high-priority items
2. **Read implementation guide** - Follow established patterns
3. **Create feature branch** - Use `tool-view/[tool-name]` naming
4. **Implement with tests** - Include unit and integration tests
5. **Update documentation** - Add README and update guides
6. **Request review** - Ensure quality and consistency

### Code Quality Standards
- **TypeScript strict mode** - Full type safety required
- **Component testing** - Unit tests for data processing, integration tests for rendering
- **Documentation** - README for each tool with usage examples
- **Accessibility** - WCAG 2.1 AA compliance minimum
- **Performance** - Lighthouse scores >90 for tool view pages

### Design Review Process
- **Visual consistency** - Matches established design system
- **User experience** - Intuitive and helpful information display
- **Mobile responsiveness** - Works well on all screen sizes
- **Theme support** - Proper dark/light mode implementation

## 📚 Resources

### Documentation
- [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - Step-by-step development guide
- [`TODO.md`](./TODO.md) - Roadmap and priority planning
- Individual tool READMEs - Specific implementation details

### External References
- [Lucide React Icons](https://lucide.dev/) - Icon library
- [Tailwind CSS](https://tailwindcss.com/docs) - Styling system
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) - Testing utilities

### Design Inspiration
- Modern dashboard interfaces for data visualization patterns
- Developer tools UIs for technical information display
- Content management systems for expandable/collapsible layouts
- Analytics platforms for metrics and status indicators

## 🆘 Support

### Common Issues
- **Tool not displaying correctly** → Check ToolViewRegistry registration
- **Data parsing errors** → Review utility functions and add fallbacks
- **Theme inconsistencies** → Follow color system guidelines
- **Performance issues** → Implement lazy loading and virtualization

### Getting Help
- Review existing implementations for similar patterns
- Check the implementation guide for step-by-step instructions
- Look at shared utilities for common data processing needs
- Test with real agent tool data when possible

---

**Next Steps**: Start by exploring the [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) and picking a high-priority tool from [`TODO.md`](./TODO.md) to implement! 