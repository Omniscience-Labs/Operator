"""
Tests for memory integration with Mem0.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from services.memory import memory_service, MemoryService

class TestMemoryService:
    """Test cases for MemoryService."""
    
    def test_memory_service_initialization_without_mem0(self):
        """Test that memory service gracefully handles missing Mem0."""
        with patch('services.memory.MEM0_AVAILABLE', False):
            service = MemoryService()
            assert not service.enabled
            assert service.client is None
    
    def test_memory_service_initialization_without_api_key(self):
        """Test that memory service handles missing API key."""
        with patch('services.memory.MEM0_AVAILABLE', True), \
             patch.dict('os.environ', {}, clear=True), \
             patch('services.memory.config') as mock_config:
            
            # Mock config without MEM0_API_KEY
            mock_config.MEM0_API_KEY = None
            
            service = MemoryService()
            assert not service.enabled
            assert service.client is None
    
    @pytest.mark.asyncio
    async def test_add_memory_when_disabled(self):
        """Test add_memory returns None when service is disabled."""
        service = MemoryService()
        service.enabled = False
        
        result = await service.add_memory(
            messages=[{"role": "user", "content": "test"}],
            user_id="test_user"
        )
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_search_memory_when_disabled(self):
        """Test search_memory returns empty list when service is disabled."""
        service = MemoryService()
        service.enabled = False
        
        result = await service.search_memory(
            query="test query",
            user_id="test_user"
        )
        
        assert result == []
    
    @pytest.mark.asyncio
    async def test_add_memory_with_agent_id(self):
        """Test add_memory includes agent_id for custom agents."""
        service = MemoryService()
        service.enabled = True
        service.client = AsyncMock()
        
        messages = [{"role": "user", "content": "test message"}]
        user_id = "test_user"
        agent_id = "custom_agent"
        
        await service.add_memory(messages, user_id, agent_id)
        
        service.client.add.assert_called_once_with(
            messages, 
            user_id=user_id, 
            agent_id=agent_id
        )
    
    @pytest.mark.asyncio
    async def test_add_memory_without_agent_id(self):
        """Test add_memory excludes agent_id for default agent."""
        service = MemoryService()
        service.enabled = True
        service.client = AsyncMock()
        
        messages = [{"role": "user", "content": "test message"}]
        user_id = "test_user"
        
        await service.add_memory(messages, user_id)
        
        service.client.add.assert_called_once_with(
            messages, 
            user_id=user_id
        )
    
    @pytest.mark.asyncio
    async def test_search_memory_with_agent_id(self):
        """Test search_memory includes agent_id for custom agents."""
        service = MemoryService()
        service.enabled = True
        service.client = AsyncMock()
        service.client.search.return_value = {"results": []}
        
        query = "test query"
        user_id = "test_user"
        agent_id = "custom_agent"
        
        await service.search_memory(query, user_id, agent_id)
        
        service.client.search.assert_called_once_with(
            query,
            user_id=user_id,
            agent_id=agent_id,
            limit=5
        )
    
    @pytest.mark.asyncio
    async def test_search_memory_without_agent_id(self):
        """Test search_memory excludes agent_id for default agent."""
        service = MemoryService()
        service.enabled = True
        service.client = AsyncMock()
        service.client.search.return_value = {"results": []}
        
        query = "test query"
        user_id = "test_user"
        
        await service.search_memory(query, user_id)
        
        service.client.search.assert_called_once_with(
            query,
            user_id=user_id,
            limit=5
        )
    
    def test_format_memories_for_context_empty(self):
        """Test format_memories_for_context with empty memories."""
        service = MemoryService()
        result = service.format_memories_for_context([])
        assert result == ""
    
    def test_format_memories_for_context_with_memories(self):
        """Test format_memories_for_context with sample memories."""
        service = MemoryService()
        memories = [
            {"memory": "User likes hiking"},
            {"text": "User prefers Python programming"},
            {"content": "User is interested in AI"}
        ]
        
        result = service.format_memories_for_context(memories)
        
        assert "## Relevant Memories" in result
        assert "- User likes hiking" in result
        assert "- User prefers Python programming" in result
        assert "- User is interested in AI" in result
        assert "---" in result
    
    @pytest.mark.asyncio
    async def test_add_memory_error_handling(self):
        """Test add_memory handles errors gracefully."""
        service = MemoryService()
        service.enabled = True
        service.client = AsyncMock()
        service.client.add.side_effect = Exception("Mem0 service error")
        
        result = await service.add_memory(
            messages=[{"role": "user", "content": "test"}],
            user_id="test_user"
        )
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_search_memory_error_handling(self):
        """Test search_memory handles errors gracefully."""
        service = MemoryService()
        service.enabled = True
        service.client = AsyncMock()
        service.client.search.side_effect = Exception("Mem0 service error")
        
        result = await service.search_memory(
            query="test query",
            user_id="test_user"
        )
        
        assert result == []


class TestThreadManagerMemoryIntegration:
    """Test memory integration in ThreadManager."""
    
    @pytest.mark.asyncio
    async def test_get_thread_metadata_caching(self):
        """Test thread metadata caching functionality."""
        from agentpress.thread_manager import ThreadManager
        
        # Mock the database client
        mock_client = AsyncMock()
        mock_client.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = Mock(
            data={'account_id': 'user123', 'agent_id': 'agent456'}
        )
        
        thread_manager = ThreadManager()
        thread_manager.db.client = AsyncMock(return_value=mock_client)
        
        # First call should hit database
        result1 = await thread_manager._get_thread_metadata("thread123")
        
        # Second call should use cache
        result2 = await thread_manager._get_thread_metadata("thread123")
        
        assert result1 == {"user_id": "user123", "agent_id": "agent456"}
        assert result2 == {"user_id": "user123", "agent_id": "agent456"}
        
        # Database should only be called once due to caching
        mock_client.table.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_message_for_memory_user_message(self):
        """Test processing user messages for memory storage."""
        from agentpress.thread_manager import ThreadManager
        
        thread_manager = ThreadManager()
        thread_manager._add_to_memory = AsyncMock()
        
        message = {
            'type': 'user',
            'content': '{"role": "user", "content": "Hello, I need help with Python"}'
        }
        
        await thread_manager._process_message_for_memory(message, "thread123")
        
        thread_manager._add_to_memory.assert_called_once_with(
            [{"role": "user", "content": "Hello, I need help with Python"}],
            "thread123"
        )
    
    @pytest.mark.asyncio
    async def test_process_message_for_memory_assistant_message(self):
        """Test processing assistant messages for memory storage."""
        from agentpress.thread_manager import ThreadManager
        
        thread_manager = ThreadManager()
        thread_manager._add_to_memory = AsyncMock()
        
        message = {
            'type': 'assistant',
            'content': {"role": "assistant", "content": "I can help you with Python programming!"}
        }
        
        await thread_manager._process_message_for_memory(message, "thread123")
        
        thread_manager._add_to_memory.assert_called_once_with(
            [{"role": "assistant", "content": "I can help you with Python programming!"}],
            "thread123"
        )
    
    @pytest.mark.asyncio
    async def test_process_message_for_memory_non_conversational(self):
        """Test that non-conversational messages are not processed for memory."""
        from agentpress.thread_manager import ThreadManager
        
        thread_manager = ThreadManager()
        thread_manager._add_to_memory = AsyncMock()
        
        message = {
            'type': 'status',  # Not user or assistant
            'content': 'System status message'
        }
        
        await thread_manager._process_message_for_memory(message, "thread123")
        
        # Should not call _add_to_memory for non-conversational messages
        thread_manager._add_to_memory.assert_not_called()


if __name__ == "__main__":
    pytest.main([__file__])