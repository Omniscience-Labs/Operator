import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from agent.tools.sb_podcast_tool import SandboxPodcastTool
from agentpress.thread_manager import ThreadManager


class TestSandboxPodcastTool:
    
    @pytest.fixture
    def mock_thread_manager(self):
        return Mock(spec=ThreadManager)
    
    @pytest.fixture
    def podcast_tool(self, mock_thread_manager):
        return SandboxPodcastTool(project_id="test_project", thread_manager=mock_thread_manager)
    
    @patch('agent.tools.sb_podcast_tool.subprocess.run')
    def test_check_podcastfy_installation_success(self, mock_subprocess, podcast_tool):
        """Test successful podcastfy installation check."""
        # Mock successful import
        with patch('agent.tools.sb_podcast_tool.importlib.import_module'):
            result = podcast_tool._check_podcastfy_installation()
            assert result is True
    
    @patch('agent.tools.sb_podcast_tool.subprocess.run')
    def test_check_podcastfy_installation_install_needed(self, mock_subprocess, podcast_tool):
        """Test podcastfy installation when not present."""
        mock_subprocess.return_value = Mock()
        
        # Mock ImportError then successful import after installation
        with patch('builtins.__import__', side_effect=[ImportError, Mock]):
            result = podcast_tool._check_podcastfy_installation()
            assert result is True
            mock_subprocess.assert_called_once()
    
    def test_validate_file_exists_true(self, podcast_tool):
        """Test file existence validation when file exists."""
        with patch.object(podcast_tool, 'sandbox') as mock_sandbox:
            mock_sandbox.fs.get_file_info.return_value = Mock()
            result = podcast_tool._validate_file_exists("/test/path")
            assert result is True
    
    def test_validate_file_exists_false(self, podcast_tool):
        """Test file existence validation when file doesn't exist."""
        with patch.object(podcast_tool, 'sandbox') as mock_sandbox:
            mock_sandbox.fs.get_file_info.side_effect = Exception("File not found")
            result = podcast_tool._validate_file_exists("/test/path")
            assert result is False
    
    @pytest.mark.asyncio
    async def test_generate_podcast_no_content_sources(self, podcast_tool):
        """Test generate_podcast with no content sources."""
        with patch.object(podcast_tool, '_ensure_sandbox', new_callable=AsyncMock):
            result = await podcast_tool.generate_podcast()
            assert not result.success
            assert "At least one content source" in result.output
    
    @pytest.mark.asyncio
    async def test_generate_podcast_with_urls(self, podcast_tool):
        """Test generate_podcast with URL sources."""
        urls = ["https://example.com/article1", "https://example.com/article2"]
        
        with patch.object(podcast_tool, '_ensure_sandbox', new_callable=AsyncMock), \
             patch.object(podcast_tool, '_check_podcastfy_installation', return_value=True), \
             patch.object(podcast_tool, '_generate_podcast_with_podcastfy', new_callable=AsyncMock) as mock_generate, \
             patch.object(podcast_tool.sandbox.fs, 'create_folder'), \
             patch.object(podcast_tool.sandbox.fs, 'upload_file'):
            
            # Mock successful generation result
            mock_generate.return_value = {
                "status": "success",
                "result": ("transcript.txt", "audio.mp3")
            }
            
            # Mock file operations
            with patch('os.path.exists', return_value=True), \
                 patch('builtins.open', create=True) as mock_open:
                mock_open.return_value.__enter__.return_value.read.return_value = "test content"
                
                result = await podcast_tool.generate_podcast(urls=urls)
                assert result.success
                assert "Podcast generated successfully" in result.output


if __name__ == "__main__":
    pytest.main([__file__]) 