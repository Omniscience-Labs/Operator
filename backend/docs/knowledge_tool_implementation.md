# Knowledge Search Tool Implementation

## Overview

The Knowledge Search Tool is an AgentPress tool that enables agents to search through custom knowledge bases using semantic search powered by LlamaIndex and LlamaCloud.

## Architecture

### Database Schema

Two new tables were created:

1. **knowledge_bases**
   - Stores knowledge base configurations
   - Links to agents via `agent_id`
   - Supports both managed (file upload) and external (existing index) types
   - Tracks indexing status and errors

2. **knowledge_base_files**
   - Tracks files uploaded to managed knowledge bases
   - Stores file metadata and indexing status

### Backend Components

1. **KnowledgeSearchTool** (`backend/agent/tools/knowledge_search_tool.py`)
   - Implements the AgentPress tool interface
   - Provides `search_knowledge` and `list_knowledge_bases` functions
   - Automatically loaded for agents with knowledge bases

2. **Knowledge API** (`backend/agent/knowledge_api.py`)
   - RESTful API endpoints for CRUD operations
   - File upload handling
   - Authentication and authorization

3. **Tool Registration**
   - Automatically registered in `run.py` for agents with knowledge bases
   - Works alongside existing AgentPress tools

### Frontend Components

1. **React Query Hooks** (`frontend/src/hooks/react-query/knowledge/use-knowledge-bases.ts`)
   - Complete CRUD operations for knowledge bases
   - File upload/delete operations
   - Optimistic updates and error handling

2. **Knowledge Base UI** (`frontend/src/app/(dashboard)/agents/_components/knowledge-base-configuration.tsx`)
   - Drag-and-drop file upload interface
   - Support for external index keys
   - Real-time status updates
   - Integrated into agent creation/update dialogs

## Current Implementation Status

### ✅ Completed
- Database schema and migrations
- Backend API endpoints
- Frontend UI components
- React Query integration
- Tool registration in agent runtime
- Basic file upload flow

### 🚧 TODO
1. **LlamaCloud Integration**
   - Implement actual file indexing with LlamaCloud API
   - Update `_query_llama_cloud_index` method
   - Handle index creation and updates

2. **File Storage**
   - Integrate with S3 or similar for file storage
   - Implement file upload to storage in API

3. **Background Processing**
   - Add background job for file indexing
   - Update file/knowledge base status after indexing
   - Handle indexing errors

4. **Tool Description Injection**
   - Dynamically generate tool descriptions based on knowledge base names/descriptions
   - Inject into agent's system prompt or tool configuration

## Usage

### Creating a Knowledge Base

1. Navigate to agent creation/edit dialog
2. Click on "Knowledge" tab
3. Create new knowledge base:
   - **Managed**: Upload files directly
   - **External**: Enter existing LlamaCloud index ID

### Using in Agent

The knowledge tool is automatically available to agents with configured knowledge bases. The agent can use:

```
search_knowledge("query about company policies", knowledge_base_name="Company Docs")
list_knowledge_bases()
```

## Environment Variables Required

```bash
LLAMA_CLOUD_API_KEY=your_api_key
OPENAI_API_KEY=your_openai_key  # For embeddings
```

## Next Steps for Production

1. **Implement LlamaCloud Integration**
   ```python
   # In knowledge_search_tool.py
   async def _query_llama_cloud_index(self, index_id: str, query: str, top_k: int):
       # Implement actual API call
       pass
   ```

2. **Add File Storage**
   ```python
   # In knowledge_api.py upload endpoint
   # Upload to S3 before creating file record
   ```

3. **Background Job Processing**
   - Use Celery or similar for async indexing
   - Update status after completion

4. **Enhanced Tool Descriptions**
   - Generate dynamic descriptions based on knowledge base content
   - Consider using LLM to summarize knowledge base purpose

5. **Testing**
   - Add unit tests for tool functionality
   - Integration tests for full upload/index/search flow
   - E2E tests for UI components

## Security Considerations

- Files are scoped to user accounts via RLS
- Knowledge bases can be agent-specific or account-wide
- Consider file type validation and virus scanning
- Implement rate limiting for uploads

## Performance Optimization

- Consider caching frequent queries
- Implement pagination for large file lists
- Use background jobs for heavy indexing tasks
- Monitor LlamaCloud API usage and costs