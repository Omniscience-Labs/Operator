# Excel Tool Views

A comprehensive set of React components for displaying Excel operations in the Operator AI interface.

## Overview

The Excel Tool Views provide beautiful, intuitive UI components for displaying Excel operations performed by the AI agent. These components follow the established patterns of other tool views in the application while adding Excel-specific features.

## Components

### ExcelToolView

The main component that renders different Excel operations based on the operation type.

```tsx
import { ExcelToolView } from './excel-tool/ExcelToolView';

<ExcelToolView
  name="create-workbook"
  assistantContent={assistantContent}
  toolContent={toolContent}
  isSuccess={true}
  isStreaming={false}
/>
```

### Supported Operations

1. **Create Workbook** (`create-workbook`)
   - Creates a new Excel file with specified sheets
   - Shows created file path and sheet names
   - Visual indicators for success/failure

2. **Write Data** (`write-data`)
   - Writes data to specific cells in a worksheet
   - Displays the data in a formatted table
   - Shows file path, sheet name, and cell range
   - Expandable view for large datasets

3. **Read Data** (`read-data`)
   - Reads data from a worksheet
   - Renders data in an Excel-like table format
   - Column headers (A, B, C...) and row numbers
   - Handles numeric formatting and formulas
   - Preview mode for large datasets

4. **List Sheets** (`list-sheets`)
   - Lists all worksheets in a workbook
   - Shows sheet count and names
   - Interactive sheet tabs when applicable

## Features

### Data Table Rendering
- Excel-like appearance with borders and headers
- Column letters (A, B, C...) and row numbers
- Hover effects on rows
- Special formatting for:
  - Numbers (right-aligned, tabular numerals)
  - Formulas (monospace font, purple color)
  - Headers (bold, gray background)

### Interactive Elements
- Expandable/collapsible views for large data
- Sheet tabs for multi-sheet workbooks
- Copy-friendly table format
- Dark mode support

### Visual Design
- Color-coded operations:
  - Create: Emerald theme
  - Write: Blue theme
  - Read: Purple theme
  - List: Orange theme
- Gradient backgrounds and borders
- Consistent icon usage
- Loading states with animations

### Error Handling
- Clear error messages
- Visual error indicators
- Graceful fallbacks for missing data

## Usage Example

```tsx
// In your thread content component
import { ToolView } from '@/components/thread/tool-views/wrapper/ToolViewRegistry';

// The tool view will automatically be selected based on the tool name
<ToolView
  name="read-data"
  assistantContent={message.assistantContent}
  toolContent={message.toolContent}
  isSuccess={true}
  isStreaming={false}
/>
```

## Integration

The Excel tool views are integrated into the application through:

1. **Tool Registry** - Registered in `ToolViewRegistry.tsx`
2. **Icon Mapping** - Icons added to `getToolIcon()` in `utils.ts`
3. **Display Names** - Names added to `TOOL_DISPLAY_NAMES` map
4. **Tool Titles** - Titles added to `getToolTitle()` function

## Showcase

View all Excel tool variations in the showcase component:

```tsx
import { ExcelToolShowcase } from './excel-tool/ExcelToolShowcase';

// Renders examples of all Excel operations
<ExcelToolShowcase />
```

## Design Principles

1. **Consistency** - Follows existing tool view patterns
2. **Clarity** - Clear visual hierarchy and information display
3. **Performance** - Efficient rendering of large datasets
4. **Accessibility** - Proper contrast, readable fonts, keyboard navigation
5. **Responsiveness** - Works well on different screen sizes

## Technical Details

### Data Parsing
The `extractExcelData` utility function handles:
- Multiple response formats
- Success/error states
- Parameter extraction
- Legacy format compatibility

### Cell Formatting
- Automatic column letter generation
- Number detection and formatting
- Formula highlighting
- Null/undefined handling

### Performance Optimizations
- Data preview limiting (10x10 cells)
- Virtualized scrolling for large datasets
- Memoized computations
- Efficient re-renders 