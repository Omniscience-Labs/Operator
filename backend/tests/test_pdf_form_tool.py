import pytest
import asyncio
import tempfile
import os
from unittest.mock import AsyncMock, MagicMock
from agent.tools.sb_pdf_form_tool import SandboxPDFFormTool
from agentpress.thread_manager import ThreadManager


class MockSandbox:
    """Mock sandbox for testing"""
    def __init__(self):
        self.fs = MockFileSystem()
        self.process = MockProcess()
        
    def get_preview_link(self, port):
        return f"http://localhost:{port}"


class MockFileSystem:
    """Mock file system operations"""
    def __init__(self):
        self.files = {}
        
    def get_file_info(self, path):
        if path not in self.files:
            raise Exception(f"File not found: {path}")
        return {"exists": True}
        
    def upload_file(self, content, path):
        self.files[path] = content
        
    def download_file(self, path):
        if path not in self.files:
            raise Exception(f"File not found: {path}")
        return self.files[path]
        
    def delete_file(self, path):
        if path in self.files:
            del self.files[path]


class MockProcess:
    """Mock process execution"""
    def __init__(self):
        self.pypdfform_installed = False
        
    def exec(self, command, timeout=None):
        result = MagicMock()
        
        # Mock PyPDFForm installation check
        if "import PyPDFForm" in command:
            if self.pypdfform_installed:
                result.exit_code = 0
                result.result = "1.4.36"
            else:
                result.exit_code = 1
                result.result = "No module named 'PyPDFForm'"
                
        # Mock pip install
        elif "pip install" in command and "PyPDFForm" in command:
            self.pypdfform_installed = True
            result.exit_code = 0
            result.result = "Successfully installed PyPDFForm"
            
        # Mock Python script execution
        elif "python3" in command and "temp_pdf_script" in command:
            result.exit_code = 0
            # Return different results based on the operation
            if "get_form_field_names" in command:
                result.result = '''{"success": true, "field_names": ["name", "email", "subscribe"], "field_count": 3}'''
            elif "wrapper.fill" in command:
                result.result = '''{"success": true, "message": "Successfully filled PDF form", "output_file": "test_filled.pdf"}'''
            elif "wrapper.flatten" in command:
                result.result = '''{"success": true, "message": "Successfully flattened PDF form", "output_file": "test_flattened.pdf"}'''
            else:
                result.result = '''{"success": true}'''
        else:
            result.exit_code = 0
            result.result = ""
            
        return result


class TestSandboxPDFFormTool:
    """Test cases for SandboxPDFFormTool"""
    
    @pytest.fixture
    def thread_manager(self):
        """Create a mock thread manager"""
        manager = MagicMock(spec=ThreadManager)
        manager.db = MagicMock()
        manager.db.client = AsyncMock()
        
        # Mock database response
        mock_client = AsyncMock()
        mock_table = AsyncMock()
        mock_select = AsyncMock()
        mock_eq = AsyncMock()
        mock_execute = AsyncMock()
        
        project_data = {
            'data': [{
                'project_id': 'test-project',
                'sandbox': {
                    'id': 'test-sandbox-id',
                    'pass': 'test-password'
                }
            }]
        }
        
        mock_execute.return_value = project_data
        mock_eq.return_value.execute = mock_execute
        mock_select.return_value.eq = mock_eq
        mock_table.return_value.select = mock_select
        mock_client.table = mock_table
        
        manager.db.client = mock_client
        return manager
        
    @pytest.fixture
    def tool(self, thread_manager):
        """Create PDF form tool instance"""
        tool = SandboxPDFFormTool(
            project_id="test-project",
            thread_manager=thread_manager
        )
        # Set up mock sandbox
        tool._sandbox = MockSandbox()
        tool._sandbox_id = "test-sandbox-id"
        return tool
        
    @pytest.mark.asyncio
    async def test_read_form_fields(self, tool):
        """Test reading form fields from a PDF"""
        # Add a test PDF file
        tool._sandbox.fs.files['/workspace/test.pdf'] = b'test pdf content'
        
        result = await tool.read_form_fields("test.pdf")
        
        assert result.success is True
        assert "field_names" in result.data
        assert result.data["field_count"] == 3
        
    @pytest.mark.asyncio
    async def test_fill_form(self, tool):
        """Test filling a PDF form"""
        # Add a test PDF file
        tool._sandbox.fs.files['/workspace/test.pdf'] = b'test pdf content'
        
        fields = {
            "name": "John Doe",
            "email": "john@example.com",
            "subscribe": True
        }
        
        result = await tool.fill_form("test.pdf", fields)
        
        assert result.success is True
        assert "Successfully filled PDF form" in result.data["message"]
        
    @pytest.mark.asyncio
    async def test_fill_form_with_output_path(self, tool):
        """Test filling a PDF form with custom output path"""
        # Add a test PDF file
        tool._sandbox.fs.files['/workspace/test.pdf'] = b'test pdf content'
        
        fields = {"name": "John Doe"}
        
        result = await tool.fill_form("test.pdf", fields, "custom_output.pdf")
        
        assert result.success is True
        assert "output_file" in result.data
        
    @pytest.mark.asyncio
    async def test_get_form_field_value(self, tool):
        """Test getting a specific field value"""
        # Add a test PDF file
        tool._sandbox.fs.files['/workspace/test.pdf'] = b'test pdf content'
        
        # Mock the response for get_form_field_value
        tool._sandbox.process.exec = lambda cmd, timeout=None: MagicMock(
            exit_code=0,
            result='{"success": true, "field_name": "email", "value": "test@example.com"}'
        )
        
        result = await tool.get_form_field_value("test.pdf", "email")
        
        assert result.success is True
        assert result.data["field_name"] == "email"
        assert result.data["value"] == "test@example.com"
        
    @pytest.mark.asyncio
    async def test_flatten_form(self, tool):
        """Test flattening a PDF form"""
        # Add a test PDF file
        tool._sandbox.fs.files['/workspace/test.pdf'] = b'test pdf content'
        
        result = await tool.flatten_form("test.pdf")
        
        assert result.success is True
        assert "Successfully flattened PDF form" in result.data["message"]
        
    @pytest.mark.asyncio
    async def test_file_not_found(self, tool):
        """Test error handling when file doesn't exist"""
        result = await tool.read_form_fields("nonexistent.pdf")
        
        assert result.success is False
        assert "does not exist" in result.error
        
    @pytest.mark.asyncio
    async def test_ensure_pypdfform_installed(self, tool):
        """Test PyPDFForm installation check"""
        # Initially not installed
        tool._sandbox.process.pypdfform_installed = False
        
        await tool._ensure_pypdfform_installed()
        
        # Should be installed now
        assert tool._sandbox.process.pypdfform_installed is True


def test_sync():
    """Sync test runner"""
    test = TestSandboxPDFFormTool()
    thread_manager = test.thread_manager()
    tool = test.tool(thread_manager)
    
    # Run async tests
    asyncio.run(test.test_read_form_fields(tool))
    asyncio.run(test.test_fill_form(tool))
    print("All tests passed!")


if __name__ == "__main__":
    test_sync() 