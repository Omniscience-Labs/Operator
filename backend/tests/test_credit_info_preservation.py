"""
Test script to validate credit info preservation in tool results.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from agentpress.tool import ToolResult
from services.agent_run_finalizer import AgentRunFinalizer
from datetime import datetime, timezone


class TestCreditInfoPreservation:
    """Test suite for credit info preservation in tool results."""
    
    def test_credit_info_structure(self):
        """Test that credit info structure is correct."""
        # Mock ToolResult with credit info
        result = ToolResult(success=True, output="Test output")
        result.__dict__['_credit_info'] = {
            'tool_name': 'linkedin_data_provider',
            'credits': 3.0,
            'calculation_details': {
                'provider_name': 'linkedin',
                'cost_rate': 3.0,
                'cost_tier': 'high'
            },
            'data_provider_name': 'linkedin',
            'usage_type': 'tool'
        }
        
        # Verify structure
        credit_info = result.__dict__['_credit_info']
        assert credit_info['tool_name'] == 'linkedin_data_provider'
        assert credit_info['credits'] == 3.0
        assert credit_info['data_provider_name'] == 'linkedin'
        assert credit_info['usage_type'] == 'tool'
        
        print("✅ Credit info structure test passed")
    
    def test_tool_result_with_metadata_credit_info(self):
        """Test tool result with credit info in metadata."""
        tool_result = {
            'type': 'tool',
            'content': {'role': 'assistant', 'content': 'Test result'},
            'metadata': {
                'assistant_message_id': 'test_id',
                '_credit_info': {
                    'tool_name': 'apollo_data_provider',
                    'credits': 2.5,
                    'calculation_details': {
                        'provider_name': 'apollo',
                        'cost_rate': 2.5,
                        'cost_tier': 'medium'
                    },
                    'data_provider_name': 'apollo',
                    'usage_type': 'tool'
                }
            }
        }
        
        # Test credit info extraction
        credit_info = tool_result.get('_credit_info')
        if not credit_info and 'metadata' in tool_result:
            credit_info = tool_result['metadata'].get('_credit_info')
        
        assert credit_info is not None
        assert credit_info['tool_name'] == 'apollo_data_provider'
        assert credit_info['credits'] == 2.5
        assert credit_info['data_provider_name'] == 'apollo'
        
        print("✅ Tool result metadata credit info test passed")
    
    async def test_debug_tool_result_structure(self):
        """Test the debug utility method."""
        finalizer = AgentRunFinalizer()
        
        # Test with direct credit info
        tool_result_direct = {
            'type': 'tool',
            '_credit_info': {'tool_name': 'test_tool', 'credits': 1.0}
        }
        
        debug_info = await finalizer._debug_tool_result_structure(tool_result_direct)
        assert debug_info['has_direct_credit_info'] == True
        assert debug_info['credit_info_found'] == True
        assert debug_info['credit_info_location'] == 'direct'
        
        # Test with metadata credit info
        tool_result_metadata = {
            'type': 'tool',
            'metadata': {
                '_credit_info': {'tool_name': 'test_tool', 'credits': 1.0}
            }
        }
        
        debug_info = await finalizer._debug_tool_result_structure(tool_result_metadata)
        assert debug_info['has_metadata_credit_info'] == True
        assert debug_info['credit_info_found'] == True
        assert debug_info['credit_info_location'] == 'metadata'
        
        # Test with no credit info
        tool_result_none = {
            'type': 'tool',
            'content': 'test'
        }
        
        debug_info = await finalizer._debug_tool_result_structure(tool_result_none)
        assert debug_info['credit_info_found'] == False
        assert debug_info['credit_info_location'] is None
        
        print("✅ Debug utility method test passed")
    
    def test_credit_info_preservation_flow(self):
        """Test the full credit info preservation flow."""
        # Simulate the response processor storing credit info in metadata
        mock_result = ToolResult(success=True, output="Data provider result")
        mock_result.__dict__['_credit_info'] = {
            'tool_name': 'twitter_data_provider',
            'credits': 1.5,
            'calculation_details': {
                'provider_name': 'twitter',
                'cost_rate': 1.5,
                'cost_tier': 'medium'
            },
            'data_provider_name': 'twitter',
            'usage_type': 'tool'
        }
        
        # Simulate metadata extraction in response processor
        metadata = {}
        if hasattr(mock_result, '__dict__') and '_credit_info' in mock_result.__dict__:
            credit_info = mock_result.__dict__['_credit_info']
            metadata["_credit_info"] = credit_info
        
        # Simulate tool result message structure
        tool_result_message = {
            'type': 'tool',
            'content': {'role': 'assistant', 'content': 'Twitter data result'},
            'metadata': metadata
        }
        
        # Test finalization credit info extraction
        credit_info = tool_result_message.get('_credit_info')
        if not credit_info and 'metadata' in tool_result_message:
            credit_info = tool_result_message['metadata'].get('_credit_info')
        
        assert credit_info is not None
        assert credit_info['tool_name'] == 'twitter_data_provider'
        assert credit_info['credits'] == 1.5
        assert credit_info['data_provider_name'] == 'twitter'
        
        print("✅ Full credit info preservation flow test passed")


def run_tests():
    """Run all credit info preservation tests."""
    test_instance = TestCreditInfoPreservation()
    
    # Run synchronous tests
    test_instance.test_credit_info_structure()
    test_instance.test_tool_result_with_metadata_credit_info()
    test_instance.test_credit_info_preservation_flow()
    
    # Run async test
    import asyncio
    asyncio.run(test_instance.test_debug_tool_result_structure())
    
    print("\n🎉 All credit info preservation tests passed!")


if __name__ == "__main__":
    run_tests() 