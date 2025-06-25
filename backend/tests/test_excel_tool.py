import pytest
import asyncio
import tempfile
import os
from unittest.mock import AsyncMock, MagicMock
from agent.tools.sb_excel_tool import SandboxExcelTool
from agentpress.thread_manager import ThreadManager


class MockSandbox:
    """Mock sandbox for testing"""
    def __init__(self):
        self.fs = MockFileSystem()
        self.process = MockProcess()
        
    def get_preview_link(self, port):
        return f"http://localhost:{port}"


class MockFileSystem:
    """Mock file system for testing"""
    def __init__(self):
        self.files = {}
        
    def get_file_info(self, path):
        if path in self.files:
            return MagicMock(is_dir=False, size=len(self.files[path]), mod_time="2023-01-01")
        raise FileNotFoundError(f"File {path} not found")
        
    def download_file(self, path):
        if path in self.files:
            return self.files[path]
        raise FileNotFoundError(f"File {path} not found")
        
    def upload_file(self, content, path):
        self.files[path] = content
        
    def create_folder(self, path, permissions):
        pass
        
    def set_file_permissions(self, path, permissions):
        pass


class MockProcess:
    """Mock process for testing"""
    def exec(self, command, timeout=None):
        result = MagicMock()
        result.exit_code = 0
        result.result = "success"
        return result


@pytest.fixture
async def excel_tool():
    """Create a mock Excel tool for testing"""
    thread_manager = AsyncMock()
    tool = SandboxExcelTool("test_project", thread_manager)
    
    # Mock the sandbox
    tool._sandbox = MockSandbox()
    tool.workspace_path = "/workspace"
    
    return tool


@pytest.mark.asyncio
async def test_create_workbook(excel_tool):
    """Test creating a new workbook"""
    result = await excel_tool.create_workbook("test.xlsx", ["Sheet1", "Sheet2"])
    
    assert result.success
    assert "test.xlsx" in result.content
    assert "Sheet1" in result.content
    assert "Sheet2" in result.content


@pytest.mark.asyncio
async def test_write_and_read_cell_data(excel_tool):
    """Test writing and reading cell data"""
    # First create a workbook
    await excel_tool.create_workbook("test.xlsx", ["Sheet1"])
    
    # Write data to cells
    data = [["Name", "Age", "City"], ["John", 30, "NYC"], ["Jane", 25, "LA"]]
    write_result = await excel_tool.write_cell_data("test.xlsx", "Sheet1", "A1:C3", data)
    
    assert write_result.success
    assert "A1:C3" in write_result.content
    
    # Read data back
    read_result = await excel_tool.read_cell_data("test.xlsx", "Sheet1", "A1:C3")
    
    assert read_result.success
    assert isinstance(read_result.content, dict)
    assert "data" in read_result.content


@pytest.mark.asyncio
async def test_format_cells(excel_tool):
    """Test cell formatting"""
    # Create workbook and add data
    await excel_tool.create_workbook("test.xlsx", ["Sheet1"])
    await excel_tool.write_cell_data("test.xlsx", "Sheet1", "A1", [["Header"]])
    
    # Format the cell
    result = await excel_tool.format_cells(
        "test.xlsx", "Sheet1", "A1",
        bold=True, font_color="FF0000", background_color="FFFF00"
    )
    
    assert result.success
    assert "A1" in result.content


@pytest.mark.asyncio
async def test_create_worksheet(excel_tool):
    """Test creating a new worksheet"""
    # Create initial workbook
    await excel_tool.create_workbook("test.xlsx", ["Sheet1"])
    
    # Add new worksheet
    result = await excel_tool.create_worksheet("test.xlsx", "NewSheet")
    
    assert result.success
    assert "NewSheet" in result.content


@pytest.mark.asyncio
async def test_list_worksheets(excel_tool):
    """Test listing worksheets"""
    # Create workbook with multiple sheets
    await excel_tool.create_workbook("test.xlsx", ["Sheet1", "Sheet2", "Sheet3"])
    
    # List worksheets
    result = await excel_tool.list_worksheets("test.xlsx")
    
    assert result.success
    assert isinstance(result.content, dict)
    assert "worksheets" in result.content
    assert len(result.content["worksheets"]) == 3


@pytest.mark.asyncio
async def test_save_workbook(excel_tool):
    """Test saving a workbook"""
    # Create and modify workbook
    await excel_tool.create_workbook("test.xlsx", ["Sheet1"])
    await excel_tool.write_cell_data("test.xlsx", "Sheet1", "A1", [["Test Data"]])
    
    # Save workbook
    result = await excel_tool.save_workbook("test.xlsx")
    
    assert result.success
    assert "saved successfully" in result.content


@pytest.mark.asyncio
async def test_close_workbook(excel_tool):
    """Test closing a workbook"""
    # Create workbook
    await excel_tool.create_workbook("test.xlsx", ["Sheet1"])
    
    # Close workbook
    result = await excel_tool.close_workbook("test.xlsx")
    
    assert result.success
    assert "closed successfully" in result.content


@pytest.mark.asyncio
async def test_error_handling(excel_tool):
    """Test error handling for invalid operations"""
    # Try to open non-existent file
    result = await excel_tool.open_workbook("nonexistent.xlsx")
    
    assert not result.success
    assert "does not exist" in result.content
    
    # Try to write to non-existent workbook
    result = await excel_tool.write_cell_data("nonexistent.xlsx", "Sheet1", "A1", [["data"]])
    
    assert not result.success 