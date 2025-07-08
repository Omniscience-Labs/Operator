# MemorySearchTool Error Fix Summary

## Problem Analysis

The error `'dict' object has no attribute 'schema_type'` was occurring during agent runs when trying to register the `MemorySearchTool`. The stack trace showed:

```
AttributeError: 'dict' object has no attribute 'schema_type'
  File "agentpress/tool_registry.py", line 54, in register_tool
    if schema.schema_type == SchemaType.OPENAPI:
       ^^^^^^^^^^^^^^^^^
```

## Root Cause

The issue was in the `MemorySearchTool.get_schemas()` method in `/backend/agent/tools/memory_search_tool.py`. 

**Problem**: The method was returning plain dictionaries instead of `ToolSchema` objects.

```python
# WRONG - Returns dict objects
def get_schemas(self) -> Dict[str, List[Any]]:
    return {
        "search_memory": [
            {
                "schema_type": SchemaType.OPENAPI,  # This is just a dict key, not an object attribute
                "schema": { ... }
            }
        ]
    }
```

**Expected**: The `tool_registry.py` code expects `ToolSchema` objects that have a `schema_type` attribute.

```python
# In tool_registry.py line 54:
if schema.schema_type == SchemaType.OPENAPI:  # schema should be a ToolSchema object
```

## Solution Implemented

1. **Added import**: Added `ToolSchema` to the imports in `memory_search_tool.py`:
   ```python
   from agentpress.tool import Tool, SchemaType, ToolSchema
   ```

2. **Fixed return type**: Updated the `get_schemas()` method to return `ToolSchema` objects:
   ```python
   def get_schemas(self) -> Dict[str, List[ToolSchema]]:
       return {
           "search_memory": [
               ToolSchema(
                   schema_type=SchemaType.OPENAPI,
                   schema={
                       "type": "function",
                       "function": { ... }
                   }
               )
           ]
       }
   ```

## Why This Works

- Other tools in the codebase use the `@openapi_schema` and`@xml_schema` decorators which automatically create `ToolSchema` objects
- The `MemorySearchTool` was manually building schemas, but using the wrong format
- The fix ensures consistency with the expected schema format throughout the codebase

## Files Modified

- `/backend/agent/tools/memory_search_tool.py`
  - Added `ToolSchema` import
  - Modified `get_schemas()` method to return `ToolSchema` objects instead of dictionaries
  - Updated return type annotation

## Expected Outcome

This fix should resolve the `'dict' object has no attribute 'schema_type'` error that was preventing agent runs from completing successfully when the `MemorySearchTool` was being registered.

The agent should now be able to:
1. Successfully register the `MemorySearchTool` during initialization
2. Complete agent runs without this particular error
3. Use memory search functionality when needed