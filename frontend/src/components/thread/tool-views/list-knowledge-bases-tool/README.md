# List Knowledge Bases Tool View

## Overview
The `ListKnowledgeBasesToolView` component provides a beautiful, organized interface for displaying available knowledge bases returned by the `list-available-knowledge-bases` tool.

## Features
- **Purple-themed design** consistent with knowledge-related tools
- **Card-based layout** with hover effects and smooth transitions
- **Comprehensive metadata display** including names, descriptions, and search methods
- **Badge indicators** showing search method names
- **Empty state handling** with helpful messaging
- **Dark/light theme support** with proper color schemes
- **Error handling** with user-friendly error messages

## Data Structure
The tool expects data in the following format:
```json
{
  "message": "Found 2 knowledge bases",
  "knowledge_bases": [
    {
      "name": "Tim's Old Contracts",
      "index_name": "Tims-planned-bovid-2025-06-24",
      "description": "Comprehensive repository of Previous Service Contracts...",
      "search_method": "search_tim's_old_contracts"
    }
  ]
}
```

## Visual Design
- **Header**: Purple gradient background with BookOpen icon and summary
- **Cards**: Individual knowledge base cards with hover effects
- **Badges**: Search method indicators with purple theming
- **Typography**: Clear hierarchy with proper spacing
- **Layout**: Responsive grid that adapts to screen size

## Usage
The component automatically handles:
- Data extraction from various tool result formats
- Graceful error handling for malformed data
- Responsive layout adjustments
- Theme-aware styling

## Integration
Registered in the tool view registry with the key `list-available-knowledge-bases` and uses the `BookOpen` icon for consistency with other knowledge-related tools.

## Error Handling
- Validates data structure before rendering
- Provides user-friendly error messages
- Gracefully handles missing or malformed data
- Logs errors for debugging without breaking the UI 