# Knowledge Search Tool Implementation

This document describes the implementation of the LlamaCloud knowledge search tool for AgentPress.

## Overview

The Knowledge Search Tool allows agents to search through configured LlamaCloud indices. Each knowledge base is exposed as a separate search function that the agent can call, making it easy for the agent to search the right knowledge base based on the context.

## Key Features

1. **Dynamic Function Generation**: Each knowledge base gets its own search function with custom names (e.g., `search_documentation`, `search_technical_docs`)
2. **Environment Variable Configuration**: API key and project name are configured via environment variables
3. **Clean UI Integration**: Knowledge bases are configured through a dedicated UI component in the agent builder
4. **Production-Grade**: Robust error handling, logging, and maintainable code structure
5. **Flexible Naming**: Tool names are separate from index names, allowing for clean function names while maintaining API compatibility

## Components

### Backend

#### 1. Knowledge Search Tool (`backend/agent/tools/knowledge_search_tool.py`)
- Extends the AgentPress `Tool` base class
- Dynamically creates search methods for each configured knowledge base
- Uses LlamaCloud Python SDK for index operations
- Provides a `list_available_knowledge_bases` method for discovery

#### 2. Agent Configuration Updates
- Database migration adds `knowledge_bases` JSONB column to agents table
- Tool registration in `run.py` when agent has knowledge bases configured
- Update agent tool supports knowledge base configuration

### Frontend

#### 1. Knowledge Configuration Component (`frontend/src/app/(dashboard)/agents/_components/agent-knowledge-configuration.tsx`)
- Clean UI for adding/editing knowledge bases
- Key-value pair interface for index name and description
- Integrated into agent builder UI
- Environment variables configuration is handled enterprise-side

#### 2. Type Updates
- Agent interfaces updated to include `knowledge_bases` field
- Request/response types updated for API compatibility

## Configuration

### Environment Variables
```bash
LLAMA_CLOUD_API_KEY=llx-...  # Your LlamaCloud API key
LLAMA_CLOUD_PROJECT_NAME=Default  # Your project name (optional, defaults to "Default")
```

### Agent Configuration
```json
{
  "knowledge_bases": [
    {
      "name": "documentation",
      "index_name": "my-documentation",
      "description": "Product documentation and user guides"
    },
    {
      "name": "api_reference",
      "index_name": "api-reference-index", 
      "description": "API documentation and code examples"
    }
  ]
}
```

## Usage

### For Agent Builders

1. In the agent builder UI, navigate to the "Knowledge Bases" section
2. Add knowledge bases by providing:
   - **Tool Name**: The name for the search function (e.g., `documentation`, `api_reference`)
   - **Index Name**: The exact name of your LlamaCloud index (for API calls)
   - **Description**: What information this knowledge base contains
3. Save the agent configuration

### For Agents

When an agent has knowledge bases configured, it automatically gets:

1. Individual search functions for each knowledge base:
   - `search_documentation(query: str)`
   - `search_api_reference(query: str)`

2. A listing function to see all available knowledge bases:
   - `list_available_knowledge_bases()`

### Example Agent Interaction

```xml
<function_calls>
<invoke name="list_available_knowledge_bases">
</invoke>
</function_calls>

<!-- Agent sees available knowledge bases with their tool names -->

<function_calls>
<invoke name="search_api_reference">
<parameter name="query">authentication endpoints</parameter>
</invoke>
</function_calls>

<!-- Agent receives search results from the API reference knowledge base -->
```

## Implementation Details

### Dynamic Method Creation

The tool creates methods dynamically in `_create_dynamic_methods()`:
1. Iterates through configured knowledge bases
2. Creates a safe method name from the tool name (not the index name)
3. Uses the index name for actual LlamaCloud API calls
4. Decorates the method with OpenAPI and XML schemas
5. Binds the method to the tool instance

This separation allows for clean, descriptive function names while maintaining the correct API connections to LlamaCloud indices.

### Search Configuration

The retriever is configured with balanced settings:
- `dense_similarity_top_k=3`: Top 3 results from dense retrieval
- `sparse_similarity_top_k=3`: Top 3 results from sparse retrieval  
- `alpha=0.5`: Equal weight between dense and sparse
- `enable_reranking=False`: Can be enabled for better results

### Error Handling

- Missing API key: Returns helpful error message
- Missing package: Suggests installation command
- Index connection errors: Logged and returned as tool failures
- Empty results: Returns structured "no results" response

## Testing

Run the test script to verify the implementation:

```bash
cd backend
python test_knowledge_search.py
```

The test script:
1. Checks for required environment variables
2. Creates a sample knowledge search tool
3. Tests listing and searching functions
4. Shows all dynamically created methods

## Maintenance

### Adding Features

To add new features to the knowledge search:
1. Update the search configuration in `_search_index()`
2. Add new parameters to the tool schemas
3. Update the UI component if needed

### Updating Dependencies

The tool uses `llama-index-indices-managed-llama-cloud`. Keep this updated:
```bash
pip install --upgrade llama-index-indices-managed-llama-cloud
```

## Security Considerations

1. API keys are stored as environment variables, not in the database
2. Each agent only has access to its configured knowledge bases
3. Search queries and results are logged for debugging
4. No direct index manipulation - only search operations

## Future Enhancements

1. **Reranking**: Enable reranking for better search results
2. **Hybrid Search Tuning**: Allow configuration of alpha parameter
3. **Result Limits**: Make top_k configurable per knowledge base
4. **Caching**: Cache frequently searched queries
5. **Analytics**: Track which knowledge bases are most used