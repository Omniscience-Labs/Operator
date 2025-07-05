# Knowledge Search Tool View

A comprehensive React component for displaying knowledge base search results from LlamaCloud indices in the Operator AI interface.

## Overview

The Knowledge Search Tool View provides an intuitive, visually appealing interface for displaying search results from AI agent knowledge base queries. It supports dynamic tool names, relevance scoring, and rich metadata display.

## Features

### 🔍 Smart Search Display
- **Query highlighting** with search context
- **Relevance scoring** with color-coded badges (emerald for high, blue for medium, amber for lower scores)
- **Ranked results** with clear hierarchy and numbering
- **Knowledge base branding** showing source information

### 📊 Rich Metadata
- **File information** extraction from LlamaCloud metadata
- **Page numbers** and document sections
- **Expandable content** for detailed result exploration
- **Additional metadata** display in expandable sections

### 🎨 Visual Design
- **Purple theme** with gradients suitable for knowledge/learning tools
- **BookOpen icon** and consistent branding
- **Dark/light theme support** throughout
- **Responsive layout** with proper spacing and typography

### 📋 Result Management
- **Expandable cards** for long content
- **Result count** and timing indicators
- **Empty state handling** with helpful messaging
- **Performance metrics** showing search timing

## Usage

### Basic Implementation

```tsx
import { KnowledgeSearchToolView } from './knowledge-search-tool/KnowledgeSearchToolView';

<KnowledgeSearchToolView
  name="search_documentation"
  assistantContent={assistantContent}
  toolContent={toolContent}
  isSuccess={true}
  isStreaming={false}
/>
```

### Dynamic Tool Registration

The tool view automatically handles any tool name starting with `search_` or `search-`:

```typescript
// These all use KnowledgeSearchToolView
'search_neca_manual_material_costing_07_02'
'search_documentation'
'search_api_reference'
'search-troubleshooting-guide'
```

## Data Processing

### Input Formats Supported

1. **ToolResult Format**
```json
{
  "tool": "search-neca-manual-material-costing-07-02",
  "parameters": {
    "query": "test query example"
  },
  "output": {
    "message": "Found 6 results in 'neca-manual-material-costing-07-02'",
    "results": [
      {
        "rank": 1,
        "score": 0.4908698445207563,
        "text": "Labor Unit Tables content...",
        "metadata": {
          "file_name": "neca-manual23-24.pdf",
          "page_label": 13
        }
      }
    ],
    "index": "neca-manual-material-costing-07-02",
    "description": "This is the NECA Manual of Labor Units...",
    "query": "test query example"
  },
  "success": true
}
```

2. **Direct Output Format**
```json
{
  "results": [...],
  "index": "knowledge-index",
  "description": "Knowledge base description",
  "query": "search query"
}
```

### Output Processing

The `extractKnowledgeSearchData` utility processes:

- **Query extraction** from assistant content and tool parameters
- **Result formatting** with rank, score, text, and metadata
- **Knowledge base naming** from descriptions or index names
- **Error handling** with graceful fallbacks
- **Timestamp management** for accurate timing display

## Component Architecture

### File Structure
```
knowledge-search-tool/
├── KnowledgeSearchToolView.tsx    # Main component
├── _utils.ts                      # Data extraction utilities
├── index.ts                       # Export declarations
└── README.md                      # This documentation
```

### Key Components

#### KnowledgeSearchToolView
Main display component with:
- Header with tool branding and status
- Query display section
- Results list with expandable cards
- Footer with metadata and timing

#### Data Extraction (_utils.ts)
- `extractKnowledgeSearchData()` - Processes tool content
- `KnowledgeSearchData` interface - TypeScript definitions
- `KnowledgeSearchResult` interface - Result structure

## Visual Elements

### Color Scheme
- **Primary**: Purple theme (`purple-500/400`)
- **Success**: Emerald variants
- **Error**: Rose variants
- **Scores**: Color-coded by relevance
  - High (≥80%): Emerald
  - Medium (≥60%): Blue  
  - Low (≥40%): Amber
  - Very Low (<40%): Gray

### Score Display
```tsx
⭐ 49.1%  #1    // Star icon + percentage + rank
⭐ 78.5%  #2    // Color-coded by score
⭐ 34.2%  #3    // Consistent formatting
```

### Metadata Cards
```tsx
📄 neca-manual23-24.pdf  📑 Page 13
📄 documentation.pdf     📑 Section 2.3
```

## Integration

### Tool Registry
Automatically registered for tools matching:
- `search_*` pattern
- `search-*` pattern

### Icon Mapping
- `BookOpen` icon for knowledge search tools
- Purple theme in tool headers
- Consistent with other tool views

### Title Generation
- `search_documentation` → "Search Documentation"
- `search_api_reference` → "Search Api Reference" 
- Custom names from knowledge base descriptions

## Examples

### Basic Knowledge Search
```
🔍 Search NECA Manual Material Costing
    "labor unit tables"

📊 Knowledge Results (6)
┌─────────────────────────────────────────┐
│ ⭐ 49.1%  #1                           │
│ Labor Unit Tables                       │
│ The NECA labor unit tables include...  │
│ 📄 neca-manual23-24.pdf  📑 Page 13   │
└─────────────────────────────────────────┘
```

### Multiple Results Display
- Ranked by relevance score
- Expandable for full content
- Metadata extraction from LlamaCloud
- Source document information

### Empty State
```
📚 No Results Found
   "search query here"
   
No relevant content found in the Knowledge Base
```

## Best Practices

### Data Handling
1. **Always validate** result structure before rendering
2. **Provide fallbacks** for missing metadata
3. **Handle errors gracefully** with user-friendly messages
4. **Extract meaningful names** from technical indices

### Performance
1. **Use ScrollArea** for long result lists
2. **Implement expandable content** to reduce initial render
3. **Lazy load metadata** in expanded sections
4. **Optimize re-renders** with proper state management

### Accessibility
1. **Semantic HTML** structure with proper headings
2. **Keyboard navigation** for expandable elements
3. **Screen reader support** with descriptive labels
4. **Color contrast** meeting WCAG guidelines

## Customization

### Theme Colors
Override the purple theme by modifying:
```tsx
// Header background
className="bg-purple-50/80 dark:bg-purple-900/20"

// Icon container
className="from-purple-500/20 to-purple-600/10 border-purple-500/20"

// Footer background
className="from-purple-50/90 to-purple-100/90 dark:from-purple-900/20"
```

### Score Thresholds
Adjust score color coding in `getScoreBadgeColor()`:
```typescript
if (score >= 0.8) return 'emerald';  // High relevance
if (score >= 0.6) return 'blue';     // Medium relevance  
if (score >= 0.4) return 'amber';    // Low relevance
return 'zinc';                       // Very low relevance
```

## Testing

### Unit Tests
```typescript
describe('extractKnowledgeSearchData', () => {
  it('should extract query from assistant content', () => {
    const result = extractKnowledgeSearchData(
      mockAssistantContent,
      mockToolContent,
      true
    );
    expect(result.query).toBe('test query');
  });
});
```

### Integration Tests
```typescript
describe('KnowledgeSearchToolView', () => {
  it('should render search results correctly', () => {
    render(
      <KnowledgeSearchToolView
        name="search_test"
        toolContent={mockResults}
      />
    );
    expect(screen.getByText('Knowledge Results')).toBeInTheDocument();
  });
});
```

## Future Enhancements

### Planned Features
- [ ] **Result clustering** by topic or document
- [ ] **Advanced filtering** by score, source, or date
- [ ] **Export functionality** for search results
- [ ] **Search history** with recent queries
- [ ] **Bookmarking** for important results

### Performance Improvements  
- [ ] **Virtual scrolling** for large result sets
- [ ] **Result caching** to avoid re-processing
- [ ] **Progressive loading** for metadata
- [ ] **Search suggestions** based on content

## Contributing

1. Follow the established purple theme
2. Maintain consistency with other tool views
3. Add comprehensive TypeScript types
4. Include unit tests for data processing
5. Test with real LlamaCloud responses
6. Update this documentation for new features 