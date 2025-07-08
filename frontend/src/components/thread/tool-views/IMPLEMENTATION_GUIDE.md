# Tool View Implementation Guide

A comprehensive guide for creating beautiful, consistent tool views in the Operator AI interface.

## Overview

Tool views are React components that provide rich, interactive displays for AI agent tool executions. Each tool view follows established patterns for consistency, aesthetics, and user experience.

## Architecture

### Core Components

1. **ToolViewRegistry** - Central registry managing tool-to-component mapping
2. **Tool View Components** - Individual display components for specific tools
3. **Utility Functions** - Data extraction and formatting helpers
4. **Shared Components** - Reusable UI elements (LoadingState, etc.)

### File Structure

```
tool-views/
├── IMPLEMENTATION_GUIDE.md          # This guide
├── TODO.md                         # Unimplemented tool views
├── types.ts                        # Shared TypeScript interfaces
├── utils.ts                        # Common utility functions
├── wrapper/
│   ├── ToolViewRegistry.tsx        # Tool registration system
│   └── ToolViewWrapper.tsx         # Component wrapper logic
├── shared/
│   ├── LoadingState.tsx           # Loading animation component
│   └── ImageLoader.tsx            # Image loading component
├── [tool-name]/
│   ├── ToolNameToolView.tsx       # Main component
│   ├── _utils.ts                  # Tool-specific utilities
│   ├── index.ts                   # Export declarations
│   └── README.md                  # Tool-specific documentation
└── GenericToolView.tsx            # Fallback component
```

## Creating a New Tool View

### Step 1: Create the Tool Directory

```bash
mkdir frontend/src/components/thread/tool-views/my-tool
cd frontend/src/components/thread/tool-views/my-tool
```

### Step 2: Create the Utility File (`_utils.ts`)

```typescript
import { normalizeContentToString, extractToolData } from '../utils';

export interface MyToolResult {
  // Define your tool's result structure
  status: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface MyToolData {
  // Define the processed data structure for your component
  parameter1: string | null;
  results: MyToolResult[];
  actualIsSuccess: boolean;
  actualToolTimestamp: string | null;
  actualAssistantTimestamp: string | null;
}

/**
 * Extract tool data from content
 */
export function extractMyToolData(
  assistantContent: any,
  toolContent: any,
  isSuccess: boolean,
  toolTimestamp?: string,
  assistantTimestamp?: string
): MyToolData {
  // Initialize defaults
  let parameter1: string | null = null;
  let results: MyToolResult[] = [];
  let actualIsSuccess = isSuccess;
  let actualToolTimestamp: string | null = toolTimestamp || null;
  let actualAssistantTimestamp: string | null = assistantTimestamp || null;

  // Extract parameters from assistant content
  const assistantToolData = extractToolData(assistantContent);
  if (assistantToolData.toolResult) {
    parameter1 = assistantToolData.arguments?.parameter1 || null;
  }

  // Extract results from tool content
  const toolContentStr = normalizeContentToString(toolContent);
  if (toolContentStr) {
    try {
      // Handle different response formats
      let toolData: any;
      
      if (toolContentStr.includes('ToolResult')) {
        // Extract ToolResult content
        const toolResultMatch = toolContentStr.match(/ToolResult\([^)]*output=['"](.*?)['"][^)]*\)/);
        if (toolResultMatch) {
          const cleanJson = toolResultMatch[1]
            .replace(/\\"/g, '"')
            .replace(/\\n/g, '\n');
          toolData = JSON.parse(cleanJson);
        }
      } else {
        toolData = JSON.parse(toolContentStr);
      }

      if (toolData) {
        results = toolData.results || toolData.output?.results || [];
        actualIsSuccess = toolData.success !== false;
      }
    } catch (e) {
      console.warn('Failed to parse tool content:', e);
    }
  }

  return {
    parameter1,
    results,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  };
}
```

### Step 3: Create the Main Component (`MyToolToolView.tsx`)

```typescript
import React, { useState } from 'react';
import {
  ToolIcon, // Choose appropriate icon from lucide-react
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp, getToolTitle } from '../utils';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingState } from '../shared/LoadingState';
import { extractMyToolData } from './_utils';

export function MyToolToolView({
  name = 'my-tool',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
}: ToolViewProps) {
  const { resolvedTheme } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const {
    parameter1,
    results,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp
  } = extractMyToolData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  const toolTitle = getToolTitle(name);

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
      {/* Header */}
      <CardHeader className="h-14 bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border-b p-2 px-4 space-y-2">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
              <ToolIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                {toolTitle}
              </CardTitle>
              {parameter1 && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {parameter1}
                </p>
              )}
            </div>
          </div>

          {!isStreaming && (
            <Badge
              variant="secondary"
              className={
                actualIsSuccess
                  ? "bg-gradient-to-b from-emerald-200 to-emerald-100 text-emerald-700 dark:from-emerald-800/50 dark:to-emerald-900/60 dark:text-emerald-300"
                  : "bg-gradient-to-b from-rose-200 to-rose-100 text-rose-700 dark:from-rose-800/50 dark:to-rose-900/60 dark:text-rose-300"
              }
            >
              {actualIsSuccess ? (
                <CheckCircle className="h-3.5 w-3.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              {actualIsSuccess ? 'Success' : 'Failed'}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-0 h-full flex-1 overflow-hidden relative">
        {isStreaming && results.length === 0 ? (
          <LoadingState
            icon={ToolIcon}
            iconColor="text-blue-500 dark:text-blue-400"
            bgColor="bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60 dark:shadow-blue-950/20"
            title="Processing..."
            filePath={parameter1}
            showProgress={true}
          />
        ) : results.length > 0 ? (
          <ScrollArea className="h-full w-full">
            <div className="p-4 py-0 my-4">
              {/* Results */}
              <div className="space-y-4">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm hover:shadow transition-shadow p-4"
                  >
                    {/* Render your result content here */}
                    <div className="text-sm text-zinc-700 dark:text-zinc-300">
                      {JSON.stringify(result)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-950 dark:to-zinc-900">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gradient-to-b from-blue-100 to-blue-50 shadow-inner dark:from-blue-800/40 dark:to-blue-900/60">
              <ToolIcon className="h-10 w-10 text-blue-400 dark:text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-zinc-900 dark:text-zinc-100">
              No Results
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              No data available for this operation
            </p>
          </div>
        )}
      </CardContent>

      {/* Footer */}
      <div className="px-4 py-2 h-10 bg-gradient-to-r from-blue-50/90 to-blue-100/90 dark:from-blue-900/20 dark:to-blue-800/20 backdrop-blur-sm border-t border-blue-200/50 dark:border-blue-800/50 flex justify-between items-center gap-4">
        <div className="h-full flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          {!isStreaming && results.length > 0 && (
            <Badge variant="outline" className="h-6 py-0.5">
              <ToolIcon className="h-3 w-3" />
              {results.length} results
            </Badge>
          )}
        </div>

        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {actualToolTimestamp && !isStreaming
            ? formatTimestamp(actualToolTimestamp)
            : actualAssistantTimestamp
              ? formatTimestamp(actualAssistantTimestamp)
              : ''}
        </div>
      </div>
    </Card>
  );
}
```

### Step 4: Create Index File (`index.ts`)

```typescript
export { MyToolToolView } from './MyToolToolView';
export { extractMyToolData } from './_utils';
export type { MyToolResult, MyToolData } from './_utils';
```

### Step 5: Register the Tool View

Update `frontend/src/components/thread/tool-views/wrapper/ToolViewRegistry.tsx`:

```typescript
import { MyToolToolView } from '../my-tool/MyToolToolView';

const defaultRegistry: ToolViewRegistryType = {
  // ... existing tools ...
  'my-tool': MyToolToolView,
  'my-tool-variant': MyToolToolView, // If tool has multiple variants
};
```

### Step 6: Update Utility Functions

Add to `frontend/src/components/thread/tool-views/utils.ts`:

```typescript
const toolTitles: Record<string, string> = {
  // ... existing tools ...
  'my-tool': 'My Tool Display Name',
};
```

Add to `frontend/src/components/thread/utils.ts`:

```typescript
// In getToolIcon function
case 'my-tool':
  return ToolIcon;

// In TOOL_DISPLAY_NAMES Map
['my-tool', 'My Tool Operation'],
```

## Design Patterns & Best Practices

### 1. Visual Design System

#### Color Themes by Tool Category
- **File Operations**: Green theme (`emerald-*`)
- **Web Operations**: Blue theme (`blue-*`)
- **Browser Operations**: Cyan theme (`cyan-*`)
- **Knowledge/Search**: Purple theme (`purple-*`)
- **Data Operations**: Orange theme (`orange-*`)
- **System/Command**: Gray theme (`zinc-*`)

#### Component Structure
```typescript
<Card> // Main container
  <CardHeader> // Tool info, status badge
    <ToolIcon + Title + Parameters>
    <StatusBadge>
  </CardHeader>
  
  <CardContent> // Main content area
    {isStreaming ? <LoadingState> : <Results>}
  </CardContent>
  
  <Footer> // Metadata, timestamp
    <ResultCount>
    <Timestamp>
  </Footer>
</Card>
```

### 2. Data Processing Patterns

#### Multi-Format Parsing
Always handle multiple response formats:
1. New structured format with `tool_execution`
2. ToolResult wrapped format
3. Direct JSON format
4. Legacy XML format

#### Error Handling
```typescript
try {
  // Primary parsing logic
} catch (e) {
  console.warn('Failed to parse:', e);
  // Fallback parsing logic
  // Return safe defaults
}
```

### 3. State Management

#### Loading States
- Use `isStreaming` prop for loading indicators
- Show progress when possible
- Provide meaningful loading messages

#### Expandable Content
```typescript
const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

const toggleExpand = (idx: number) => {
  setExpandedItems(prev => ({
    ...prev,
    [idx]: !prev[idx]
  }));
};
```

### 4. Accessibility

- Use semantic HTML elements
- Provide proper ARIA labels
- Ensure keyboard navigation
- Maintain color contrast ratios
- Include descriptive alt texts

### 5. Performance

- Use `ScrollArea` for long content
- Implement virtual scrolling for large datasets
- Lazy load images and heavy content
- Memoize expensive calculations

## Testing Patterns

### Unit Tests
```typescript
import { extractMyToolData } from '../_utils';

describe('extractMyToolData', () => {
  it('should extract data from tool result', () => {
    const result = extractMyToolData(
      mockAssistantContent,
      mockToolContent,
      true
    );
    
    expect(result.parameter1).toBe('expected-value');
    expect(result.results).toHaveLength(2);
  });
});
```

### Integration Tests
```typescript
import { render } from '@testing-library/react';
import { MyToolToolView } from '../MyToolToolView';

describe('MyToolToolView', () => {
  it('should render successfully', () => {
    render(
      <MyToolToolView
        assistantContent={mockAssistant}
        toolContent={mockTool}
        isSuccess={true}
      />
    );
  });
});
```

## Common Gotchas

### 1. Content Parsing
- Always handle escaped JSON in ToolResult format
- Check for nested content structures
- Provide fallbacks for missing data

### 2. Styling Consistency
- Use established color themes
- Follow spacing patterns (p-4, gap-2, etc.)
- Maintain consistent border radius and shadows

### 3. Dark Mode
- Test all color combinations
- Use appropriate dark variants
- Ensure readability in both themes

### 4. Responsive Design
- Test on different screen sizes
- Use appropriate breakpoints
- Consider mobile interactions

## Examples

### Simple Tool View
See `CompleteToolView.tsx` for a basic implementation.

### Complex Tool View
See `WebSearchToolView.tsx` for advanced features like:
- Multiple result types
- Expandable content
- Rich metadata display
- Image handling

### Data-Heavy Tool View
See `ExcelToolView.tsx` for:
- Large dataset handling
- Table rendering
- Export functionality

### Interactive Tool View
See `BrowserToolView.tsx` for:
- Real-time updates
- Image overlays
- State management

## Contributing

1. Follow the established patterns
2. Add comprehensive documentation
3. Include unit tests
4. Test in both light and dark modes
5. Ensure accessibility compliance
6. Update this guide with new patterns

## Resources

- [Lucide React Icons](https://lucide.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [React Hook Form](https://react-hook-form.com/) (for complex forms)
- [Framer Motion](https://www.framer.com/motion/) (for animations) 