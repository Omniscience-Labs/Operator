# Mem0 Integration Implementation Plan for Operator

## Executive Summary

This document outlines a production-ready implementation strategy for integrating Mem0 into the Operator platform to provide:
- **User Memory**: Persistent memory across all conversations and agents for each user
- **Agent-Specific Memory**: Dedicated memory for each custom agent to maintain personality and learned context
- **Session Memory**: Short-term memory for individual conversation sessions
- **Cross-Conversation Context**: Seamless memory retrieval and context injection

## Architecture Overview

### Current System Context
- **Users**: Managed via Basejump accounts in Supabase
- **Agents**: Custom agents stored in `agents` table with configurations and system prompts
- **Threads**: Conversation threads belonging to projects and accounts
- **Messages**: Individual conversation messages with types (user, assistant, tool, summary)
- **Context Management**: Token counting and summarization for context window management

### Mem0 Integration Points
1. **User-Level Memory** (`user_id` = `account_id`)
2. **Agent-Level Memory** (`agent_id` = custom agent identifier)
3. **Session-Level Memory** (`run_id` = agent run session)
4. **Memory Injection** into conversation context
5. **Memory Updates** from conversation interactions

## Implementation Strategy

### Phase 1: Core Memory Infrastructure

#### 1.1 Memory Service Layer
Create a centralized memory service that abstracts Mem0 operations:

```python
# backend/services/memory_service.py
from mem0 import Memory
from typing import List, Dict, Any, Optional
import json
from utils.config import config
from utils.logger import logger

class MemoryService:
    """Central service for managing Mem0 operations"""
    
    def __init__(self):
        # Initialize Mem0 with production configuration
        self.mem0_config = {
            "vector_store": {
                "provider": "qdrant",
                "config": {
                    "host": config.QDRANT_HOST or "localhost",
                    "port": config.QDRANT_PORT or 6333,
                    "collection_name": "operator_memories",
                    "api_key": config.QDRANT_API_KEY  # For Qdrant Cloud
                }
            },
            "llm": {
                "provider": "openai",
                "config": {
                    "api_key": config.OPENAI_API_KEY,
                    "model": "gpt-4o-mini",
                    "temperature": 0.1,
                    "max_tokens": 2048,
                }
            },
            "embedder": {
                "provider": "openai",
                "config": {
                    "api_key": config.OPENAI_API_KEY,
                    "model": "text-embedding-3-small"
                }
            },
            "version": "v1.1"
        }
        
        self.memory = Memory.from_config(self.mem0_config)
    
    async def add_user_memory(
        self, 
        user_id: str, 
        messages: List[Dict[str, Any]], 
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Add memories for a user from conversation messages"""
        try:
            result = self.memory.add(
                messages, 
                user_id=user_id, 
                metadata={"app": "operator", **(metadata or {})}
            )
            logger.info(f"Added user memory for {user_id}: {len(result)} memories")
            return result
        except Exception as e:
            logger.error(f"Error adding user memory: {str(e)}")
            return {}
    
    async def add_agent_memory(
        self, 
        agent_id: str, 
        messages: List[Dict[str, Any]], 
        metadata: Optional[Dict] = None
    ) -> Dict:
        """Add memories for a specific agent"""
        try:
            result = self.memory.add(
                messages, 
                agent_id=agent_id, 
                metadata={"app": "operator", "type": "agent", **(metadata or {})}
            )
            logger.info(f"Added agent memory for {agent_id}: {len(result)} memories")
            return result
        except Exception as e:
            logger.error(f"Error adding agent memory: {str(e)}")
            return {}
    
    async def add_session_memory(
        self, 
        user_id: str, 
        session_id: str, 
        messages: List[Dict[str, Any]]
    ) -> Dict:
        """Add short-term session memory"""
        try:
            result = self.memory.add(
                messages, 
                user_id=user_id, 
                run_id=session_id,
                metadata={"app": "operator", "type": "session"}
            )
            logger.info(f"Added session memory for {user_id}:{session_id}")
            return result
        except Exception as e:
            logger.error(f"Error adding session memory: {str(e)}")
            return {}
    
    async def search_user_memories(
        self, 
        user_id: str, 
        query: str, 
        limit: int = 10
    ) -> List[Dict]:
        """Search user memories"""
        try:
            results = self.memory.search(
                query=query, 
                user_id=user_id, 
                limit=limit
            )
            return results.get("results", [])
        except Exception as e:
            logger.error(f"Error searching user memories: {str(e)}")
            return []
    
    async def search_agent_memories(
        self, 
        agent_id: str, 
        query: str, 
        limit: int = 10
    ) -> List[Dict]:
        """Search agent-specific memories"""
        try:
            results = self.memory.search(
                query=query, 
                agent_id=agent_id, 
                limit=limit
            )
            return results.get("results", [])
        except Exception as e:
            logger.error(f"Error searching agent memories: {str(e)}")
            return []
    
    async def get_memory_context(
        self, 
        user_id: str, 
        agent_id: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 10
    ) -> str:
        """Generate memory context for conversation"""
        contexts = []
        
        # Get user memories
        if query:
            user_memories = await self.search_user_memories(user_id, query, limit)
        else:
            user_memories = await self.get_all_user_memories(user_id, limit)
        
        if user_memories:
            user_context = "User Context:\n" + "\n".join([
                f"- {mem.get('memory', '')}" for mem in user_memories
            ])
            contexts.append(user_context)
        
        # Get agent memories if agent specified
        if agent_id:
            if query:
                agent_memories = await self.search_agent_memories(agent_id, query, limit)
            else:
                agent_memories = await self.get_all_agent_memories(agent_id, limit)
            
            if agent_memories:
                agent_context = f"Agent Context (for {agent_id}):\n" + "\n".join([
                    f"- {mem.get('memory', '')}" for mem in agent_memories
                ])
                contexts.append(agent_context)
        
        return "\n\n".join(contexts) if contexts else ""
```

#### 1.2 Memory Configuration Management
Add Mem0 configuration to the system config:

```python
# backend/utils/config.py (additions)
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")  # For Qdrant Cloud
MEM0_ENABLED = os.getenv("MEM0_ENABLED", "true").lower() == "true"
```

#### 1.3 Database Schema Extensions
Add memory tracking to existing tables:

```sql
-- backend/supabase/migrations/20250130000000_memory_integration.sql
BEGIN;

-- Add memory configuration to agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS memory_config JSONB DEFAULT '{}'::jsonb;

-- Add memory metadata to threads
ALTER TABLE threads ADD COLUMN IF NOT EXISTS memory_session_id TEXT;

-- Create memory_events table for tracking memory operations
CREATE TABLE IF NOT EXISTS memory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES basejump.accounts(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(agent_id) ON DELETE CASCADE,
    thread_id UUID REFERENCES threads(thread_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'add', 'search', 'update', 'delete'
    memory_id TEXT, -- Mem0 memory ID
    query TEXT,
    result_count INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_events_account_id ON memory_events(account_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_agent_id ON memory_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_thread_id ON memory_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_created_at ON memory_events(created_at);

-- Enable RLS
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY memory_events_select_own ON memory_events
    FOR SELECT
    USING (basejump.has_role_on_account(account_id));

CREATE POLICY memory_events_insert_own ON memory_events
    FOR INSERT
    WITH CHECK (basejump.has_role_on_account(account_id));

COMMIT;
```

### Phase 2: Memory Integration Points

#### 2.1 Enhanced Context Manager
Extend the existing context manager to include memory:

```python
# backend/agentpress/enhanced_context_manager.py
from .context_manager import ContextManager
from services.memory_service import MemoryService
from typing import List, Dict, Any, Optional

class EnhancedContextManager(ContextManager):
    """Enhanced context manager with Mem0 integration"""
    
    def __init__(self, token_threshold: int = 120000):
        super().__init__(token_threshold)
        self.memory_service = MemoryService()
    
    async def get_enhanced_context(
        self,
        thread_id: str,
        user_id: str,
        agent_id: Optional[str] = None,
        latest_message: Optional[str] = None
    ) -> str:
        """Get enhanced context including memories"""
        
        # Get traditional context (summaries, recent messages)
        traditional_context = await self.get_thread_context(thread_id)
        
        # Get memory context
        memory_context = await self.memory_service.get_memory_context(
            user_id=user_id,
            agent_id=agent_id,
            query=latest_message,  # Use latest message to find relevant memories
            limit=10
        )
        
        # Combine contexts
        if memory_context:
            enhanced_context = f"""
{memory_context}

--- Recent Conversation ---
{traditional_context}
"""
        else:
            enhanced_context = traditional_context
        
        return enhanced_context
```

#### 2.2 Memory-Aware Thread Manager
Enhance the thread manager to handle memory operations:

```python
# backend/agentpress/memory_aware_thread_manager.py
from .thread_manager import ThreadManager
from services.memory_service import MemoryService
from typing import List, Dict, Any, Optional

class MemoryAwareThreadManager(ThreadManager):
    """Thread manager with integrated memory functionality"""
    
    def __init__(self, trace=None, is_agent_builder=False, target_agent_id=None):
        super().__init__(trace, is_agent_builder, target_agent_id)
        self.memory_service = MemoryService()
    
    async def process_conversation_for_memory(
        self,
        thread_id: str,
        user_id: str,
        agent_id: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """Process recent conversation messages for memory extraction"""
        try:
            # Get recent messages from the thread
            recent_messages = await self.get_recent_conversation_messages(thread_id, limit=10)
            
            if not recent_messages:
                return
            
            # Add to user memory
            await self.memory_service.add_user_memory(
                user_id=user_id,
                messages=recent_messages,
                metadata={"thread_id": thread_id, "agent_id": agent_id}
            )
            
            # Add to agent memory if agent specified
            if agent_id:
                await self.memory_service.add_agent_memory(
                    agent_id=agent_id,
                    messages=recent_messages,
                    metadata={"thread_id": thread_id, "user_id": user_id}
                )
            
            # Add to session memory if session specified
            if session_id:
                await self.memory_service.add_session_memory(
                    user_id=user_id,
                    session_id=session_id,
                    messages=recent_messages
                )
                
        except Exception as e:
            logger.error(f"Error processing conversation for memory: {str(e)}")
    
    async def get_recent_conversation_messages(self, thread_id: str, limit: int = 10) -> List[Dict]:
        """Get recent conversation messages formatted for Mem0"""
        client = await self.db.client
        
        try:
            messages_result = await client.table('messages').select('*') \
                .eq('thread_id', thread_id) \
                .eq('is_llm_message', True) \
                .in_('type', ['user', 'assistant']) \
                .order('created_at', desc=True) \
                .limit(limit) \
                .execute()
            
            formatted_messages = []
            for msg in reversed(messages_result.data):  # Reverse to get chronological order
                content = msg['content']
                if isinstance(content, str):
                    try:
                        content = json.loads(content)
                    except json.JSONDecodeError:
                        pass
                
                # Format for Mem0
                if isinstance(content, dict) and 'role' in content:
                    formatted_messages.append(content)
                else:
                    # Convert message type to role
                    role = 'user' if msg['type'] == 'user' else 'assistant'
                    formatted_messages.append({
                        "role": role,
                        "content": str(content)
                    })
            
            return formatted_messages
            
        except Exception as e:
            logger.error(f"Error getting recent messages: {str(e)}")
            return []
```

#### 2.3 Agent Run Integration
Integrate memory processing into the agent run system:

```python
# backend/agent/memory_enhanced_run.py
from agent.run import run_agent
from services.memory_service import MemoryService
from agentpress.memory_aware_thread_manager import MemoryAwareThreadManager

async def run_agent_with_memory(
    thread_id: str,
    project_id: str,
    stream: bool,
    model_name: str = "anthropic/claude-3-7-sonnet-latest",
    enable_thinking: Optional[bool] = False,
    reasoning_effort: Optional[str] = 'low',
    enable_context_manager: bool = True,
    agent_config: Optional[dict] = None,
    trace: Optional[StatefulTraceClient] = None,
    is_agent_builder: Optional[bool] = False,
    target_agent_id: Optional[str] = None,
    user_id: Optional[str] = None  # Add user_id parameter
):
    """Enhanced agent run with memory integration"""
    
    # Initialize memory-aware thread manager
    thread_manager = MemoryAwareThreadManager(
        trace=trace, 
        is_agent_builder=is_agent_builder, 
        target_agent_id=target_agent_id
    )
    
    # Get agent info
    agent_id = agent_config.get('agent_id') if agent_config else None
    
    # Pre-process: Inject memory context into system prompt
    if user_id and agent_config:
        memory_context = await thread_manager.memory_service.get_memory_context(
            user_id=user_id,
            agent_id=agent_id,
            limit=15
        )
        
        if memory_context:
            # Enhance system prompt with memory context
            original_prompt = agent_config.get('system_prompt', '')
            enhanced_prompt = f"""
{original_prompt}

--- Memory Context ---
{memory_context}

Use the above memory context to provide personalized responses. Reference previous conversations and learned preferences when relevant.
"""
            agent_config['system_prompt'] = enhanced_prompt
    
    # Run the original agent function
    async for response in run_agent(
        thread_id=thread_id,
        project_id=project_id,
        stream=stream,
        thread_manager=thread_manager,
        model_name=model_name,
        enable_thinking=enable_thinking,
        reasoning_effort=reasoning_effort,
        enable_context_manager=enable_context_manager,
        agent_config=agent_config,
        trace=trace,
        is_agent_builder=is_agent_builder,
        target_agent_id=target_agent_id
    ):
        yield response
    
    # Post-process: Extract and store memories
    if user_id:
        try:
            await thread_manager.process_conversation_for_memory(
                thread_id=thread_id,
                user_id=user_id,
                agent_id=agent_id,
                session_id=f"session_{thread_id}_{datetime.now().isoformat()}"
            )
        except Exception as e:
            logger.error(f"Error processing memories after agent run: {str(e)}")
```

### Phase 3: API Integration

#### 3.1 Memory Management Endpoints
Add memory management endpoints to the agent API:

```python
# backend/agent/memory_api.py
from fastapi import APIRouter, Depends, HTTPException
from services.memory_service import MemoryService
from utils.auth import get_current_user_id_from_jwt

router = APIRouter(prefix="/memory", tags=["memory"])

@router.get("/user/{user_id}")
async def get_user_memories(
    user_id: str,
    query: Optional[str] = None,
    limit: int = 20,
    current_user: str = Depends(get_current_user_id_from_jwt)
):
    """Get user memories with optional search"""
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    memory_service = MemoryService()
    
    if query:
        memories = await memory_service.search_user_memories(user_id, query, limit)
    else:
        memories = await memory_service.get_all_user_memories(user_id, limit)
    
    return {"memories": memories}

@router.get("/agent/{agent_id}")
async def get_agent_memories(
    agent_id: str,
    query: Optional[str] = None,
    limit: int = 20,
    current_user: str = Depends(get_current_user_id_from_jwt)
):
    """Get agent memories with access control"""
    # Verify agent ownership
    client = await db.client
    agent = await client.table('agents').select('account_id').eq('agent_id', agent_id).single().execute()
    
    if not agent.data or agent.data['account_id'] != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    memory_service = MemoryService()
    
    if query:
        memories = await memory_service.search_agent_memories(agent_id, query, limit)
    else:
        memories = await memory_service.get_all_agent_memories(agent_id, limit)
    
    return {"memories": memories}

@router.delete("/user/{user_id}")
async def clear_user_memories(
    user_id: str,
    current_user: str = Depends(get_current_user_id_from_jwt)
):
    """Clear all user memories"""
    if user_id != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    memory_service = MemoryService()
    await memory_service.clear_user_memories(user_id)
    
    return {"status": "cleared"}

@router.delete("/agent/{agent_id}")
async def clear_agent_memories(
    agent_id: str,
    current_user: str = Depends(get_current_user_id_from_jwt)
):
    """Clear all agent memories"""
    # Verify agent ownership
    client = await db.client
    agent = await client.table('agents').select('account_id').eq('agent_id', agent_id).single().execute()
    
    if not agent.data or agent.data['account_id'] != current_user:
        raise HTTPException(status_code=403, detail="Access denied")
    
    memory_service = MemoryService()
    await memory_service.clear_agent_memories(agent_id)
    
    return {"status": "cleared"}
```

#### 3.2 Update Agent Run Background Task
Modify the background agent runner to include memory:

```python
# backend/run_agent_background.py (modifications)
@dramatiq.actor
async def run_agent_background_with_memory(
    agent_run_id: str,
    thread_id: str,
    instance_id: str,
    project_id: str,
    model_name: str,
    enable_thinking: Optional[bool],
    reasoning_effort: Optional[str],
    stream: bool,
    enable_context_manager: bool,
    agent_config: Optional[dict] = None,
    is_agent_builder: Optional[bool] = False,
    target_agent_id: Optional[str] = None,
    request_id: Optional[str] = None,
    user_id: Optional[str] = None  # Add user_id
):
    """Enhanced background agent run with memory integration"""
    
    # ... existing setup code ...
    
    try:
        # Use the memory-enhanced agent runner
        from agent.memory_enhanced_run import run_agent_with_memory
        
        agent_gen = run_agent_with_memory(
            thread_id=thread_id,
            project_id=project_id,
            stream=stream,
            model_name=model_name,
            enable_thinking=enable_thinking,
            reasoning_effort=reasoning_effort,
            enable_context_manager=enable_context_manager,
            agent_config=agent_config,
            trace=trace,
            is_agent_builder=is_agent_builder,
            target_agent_id=target_agent_id,
            user_id=user_id  # Pass user_id for memory operations
        )
        
        # ... rest of existing code ...
        
    except Exception as e:
        # ... existing error handling ...
```

### Phase 4: Frontend Integration

#### 4.1 Memory Management UI Components
Create React components for memory management:

```typescript
// frontend/src/components/memory/MemoryViewer.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMemories } from '@/hooks/react-query/memory/use-memories';

interface MemoryViewerProps {
  userId?: string;
  agentId?: string;
  type: 'user' | 'agent';
}

export function MemoryViewer({ userId, agentId, type }: MemoryViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState([]);
  
  const { data: memoryData, isLoading, refetch } = useMemories(
    type === 'user' ? userId : agentId,
    type,
    searchQuery
  );
  
  useEffect(() => {
    if (memoryData?.memories) {
      setMemories(memoryData.memories);
    }
  }, [memoryData]);
  
  const handleSearch = () => {
    refetch();
  };
  
  const handleClearMemories = async () => {
    if (confirm('Are you sure you want to clear all memories?')) {
      // Implement clear memories API call
      await clearMemories(type === 'user' ? userId : agentId, type);
      refetch();
    }
  };
  
  return (
    <div className="memory-viewer">
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>Search</Button>
        <Button variant="destructive" onClick={handleClearMemories}>
          Clear All
        </Button>
      </div>
      
      <div className="memory-list">
        {isLoading ? (
          <div>Loading memories...</div>
        ) : (
          memories.map((memory, index) => (
            <div key={index} className="memory-item p-3 border rounded mb-2">
              <p>{memory.memory}</p>
              <small className="text-gray-500">
                Created: {new Date(memory.created_at).toLocaleDateString()}
              </small>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

#### 4.2 Memory Management Hooks
Create React Query hooks for memory operations:

```typescript
// frontend/src/hooks/react-query/memory/use-memories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const memoryKeys = {
  all: ['memories'] as const,
  user: (userId: string) => [...memoryKeys.all, 'user', userId] as const,
  agent: (agentId: string) => [...memoryKeys.all, 'agent', agentId] as const,
};

export function useMemories(id: string, type: 'user' | 'agent', query?: string) {
  return useQuery({
    queryKey: type === 'user' ? memoryKeys.user(id) : memoryKeys.agent(id),
    queryFn: async () => {
      const endpoint = type === 'user' ? `/memory/user/${id}` : `/memory/agent/${id}`;
      const params = query ? { query } : {};
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    },
    enabled: !!id,
  });
}

export function useClearMemories() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'user' | 'agent' }) => {
      const endpoint = type === 'user' ? `/memory/user/${id}` : `/memory/agent/${id}`;
      await apiClient.delete(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
    },
  });
}
```

### Phase 5: Configuration and Deployment

#### 5.1 Environment Configuration
Add necessary environment variables:

```bash
# .env additions
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_API_KEY=your_qdrant_api_key  # For Qdrant Cloud
MEM0_ENABLED=true
```

#### 5.2 Docker Configuration
Add Qdrant to docker-compose:

```yaml
# docker-compose.yml additions
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_storage:/qdrant/storage
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334

volumes:
  qdrant_storage:
```

#### 5.3 Production Deployment Considerations
1. **Qdrant Cloud**: Use managed Qdrant Cloud for production
2. **Memory Isolation**: Ensure proper isolation between users and agents
3. **Backup Strategy**: Implement regular backups of memory data
4. **Monitoring**: Add monitoring for memory operations and performance
5. **Rate Limiting**: Implement rate limiting for memory operations

## Security and Privacy Considerations

### Data Isolation
- User memories are isolated by `user_id` (account_id)
- Agent memories are isolated by `agent_id` with ownership verification
- Cross-user memory access is prevented through RLS policies

### Privacy Controls
- Users can view, search, and delete their own memories
- Users can clear agent-specific memories for agents they own
- Memory data is encrypted at rest in Qdrant
- Memory operations are logged for audit purposes

### Compliance
- GDPR compliance through user data deletion capabilities
- Data retention policies can be implemented
- Audit trail through memory_events table

## Performance Optimizations

### Memory Retrieval
- Limit memory retrieval to relevant context (10-15 memories max)
- Use semantic search to find most relevant memories
- Cache frequently accessed memories
- Implement memory importance scoring

### Context Injection
- Inject memories only when relevant to current conversation
- Use latest user message as search query for memory retrieval
- Combine user and agent memories intelligently
- Fallback gracefully when memory service is unavailable

### Scalability
- Use Qdrant Cloud for horizontal scaling
- Implement memory archiving for old/unused memories
- Batch memory operations for efficiency
- Monitor memory storage usage per user/agent

## Testing Strategy

### Unit Tests
- Memory service operations
- Context enhancement logic
- API endpoint functionality
- Error handling scenarios

### Integration Tests
- End-to-end memory flow in conversations
- Cross-agent memory isolation
- Memory persistence across sessions
- Performance under load

### User Acceptance Testing
- Memory accuracy and relevance
- Context injection quality
- User experience with memory management
- Agent personality consistency

## Rollout Plan

### Phase 1: Infrastructure (Week 1-2)
- Deploy Qdrant instance
- Implement core MemoryService
- Database migrations
- Basic API endpoints

### Phase 2: Backend Integration (Week 3-4)
- Enhanced context manager
- Memory-aware thread manager
- Agent run integration
- Testing and optimization

### Phase 3: Frontend Integration (Week 5-6)
- Memory management UI
- React hooks and components
- User experience polish
- Documentation

### Phase 4: Production Deployment (Week 7-8)
- Production deployment
- Monitoring setup
- Performance optimization
- User training and documentation

## Success Metrics

### Technical Metrics
- Memory retrieval latency < 100ms
- Memory accuracy > 85% relevance
- System uptime > 99.9%
- Memory storage efficiency

### User Experience Metrics
- Conversation personalization improvement
- User satisfaction with memory features
- Agent consistency ratings
- Memory management usage

### Business Metrics
- User retention improvement
- Conversation engagement increase
- Premium feature adoption
- Customer support ticket reduction

## Conclusion

This implementation provides a production-ready integration of Mem0 into the Operator platform, enabling:

1. **Persistent User Memory**: Cross-conversation and cross-agent context retention
2. **Agent Personality**: Consistent agent behavior through dedicated memory
3. **Contextual Conversations**: Intelligent memory injection for relevant context
4. **Privacy and Security**: Proper data isolation and user control
5. **Scalable Architecture**: Production-ready deployment with monitoring and optimization

The phased approach ensures minimal disruption to existing functionality while providing a robust foundation for advanced memory capabilities.