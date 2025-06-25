from typing import Optional, Dict, Any, List, Union
import json
import io
import base64
from agentpress.tool import ToolResult, openapi_schema, xml_schema
from sandbox.tool_base import SandboxToolsBase
from agentpress.thread_manager import ThreadManager
from utils.logger import logger

class SandboxExcelTool(SandboxToolsBase):
    """Tool for Excel operations using openpyxl in sandbox containers."""

    def __init__(self, project_id: str, thread_manager: ThreadManager):
        super().__init__(project_id, thread_manager)

    def clean_path(self, path: str) -> str:
        """Clean and normalize a path to be relative to /workspace"""
        return super().clean_path(path)

    def _file_exists(self, path: str) -> bool:
        """Check if a file exists in the sandbox"""
        try:
            self.sandbox.fs.get_file_info(path)
            return True
        except:
            return False

    def _create_excel_script(self, script_content: str) -> str:
        """Create a Python script that includes necessary imports and the provided content."""
        imports = """
import sys
import json
import base64
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.utils import get_column_letter, column_index_from_string
# Pivot table support - openpyxl only supports reading existing pivot tables
# from openpyxl.pivot.table import TableDefinition, PivotField
from openpyxl.utils.dataframe import dataframe_to_rows
import pandas as pd
import os

"""
        return imports + script_content

    async def _ensure_openpyxl_installed(self):
        """Ensure openpyxl is installed in the sandbox"""
        try:
            # Check if openpyxl is available
            response = self.sandbox.process.exec("python3 -c 'import openpyxl; print(openpyxl.__version__)'", timeout=10)
            if response.exit_code != 0:
                # Install openpyxl if not available (fallback for older containers)
                logger.info("Installing openpyxl and pandas in sandbox...")
                install_response = self.sandbox.process.exec("pip install --no-cache-dir openpyxl==3.1.5 pandas==2.2.3", timeout=120)
                if install_response.exit_code != 0:
                    raise Exception(f"Failed to install openpyxl: {install_response.result}")
                logger.info("Successfully installed openpyxl and pandas")
            else:
                logger.debug("openpyxl already available in sandbox")
                
            # Also verify pandas is available
            pandas_response = self.sandbox.process.exec("python3 -c 'import pandas; print(pandas.__version__)'", timeout=10)
            if pandas_response.exit_code != 0:
                logger.info("Installing pandas in sandbox...")
                install_response = self.sandbox.process.exec("pip install --no-cache-dir pandas==2.2.3", timeout=120)
                if install_response.exit_code != 0:
                    raise Exception(f"Failed to install pandas: {install_response.result}")
                    
        except Exception as e:
            logger.warning(f"Could not verify openpyxl/pandas installation: {e}")

    async def _execute_excel_script(self, script: str, timeout: int = 30) -> ToolResult:
        """Execute a Python script in the sandbox and return the result"""
        try:
            # Save script to a temporary file in sandbox
            script_file = f"/workspace/temp_excel_script_{hash(script) % 10000}.py"
            self.sandbox.fs.upload_file(script.encode(), script_file)
            
            # Execute the script
            response = self.sandbox.process.exec(f"cd /workspace && python3 {script_file.replace('/workspace/', '')}", timeout=timeout)
            
            # Clean up script file
            try:
                self.sandbox.fs.delete_file(script_file)
            except:
                pass
            
            if response.exit_code == 0:
                try:
                    # Try to parse JSON output
                    lines = response.result.strip().split('\n')
                    for line in reversed(lines):
                        if line.strip().startswith('{'):
                            result = json.loads(line.strip())
                            return self.success_response(result)
                    # If no JSON found, return raw output
                    return self.success_response({"message": response.result.strip()})
                except:
                    return self.success_response({"message": response.result.strip()})
            else:
                return self.fail_response(f"Script execution failed: {response.result}")
                
        except Exception as e:
            return self.fail_response(f"Error executing Excel script: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_workbook",
            "description": "Create a new Excel workbook (.xlsx) at the specified path. The path must be relative to /workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path where the Excel file will be created, relative to /workspace (e.g., 'data/report.xlsx')"
                    },
                    "sheet_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional list of sheet names to create. If not provided, creates default 'Sheet1'",
                        "default": ["Sheet1"]
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="create-workbook",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "sheet_names", "node_type": "element", "path": "sheet_names", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="create_workbook">
        <parameter name="file_path">data/sales_report.xlsx</parameter>
        <parameter name="sheet_names">["Sales", "Summary", "Charts"]</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def create_workbook(self, file_path: str, sheet_names: Optional[List[str]] = None) -> ToolResult:
        """Create a new Excel workbook at the specified path."""
        try:
            # Ensure sandbox is initialized and dependencies are available
            await self._ensure_sandbox()
            await self._ensure_openpyxl_installed()
            
            # Clean and validate the file path
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            # Ensure the file has .xlsx extension
            if not file_path.lower().endswith('.xlsx'):
                file_path += '.xlsx'
                full_path += '.xlsx'
            
            # Set default sheet names if not provided
            if sheet_names is None:
                sheet_names = ["Sheet1"]
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Create workbook
    wb = Workbook()

    # Remove default sheet if creating custom sheets
    sheet_names = {sheet_names}
    if sheet_names and sheet_names != ["Sheet1"]:
        wb.remove(wb.active)
        
    # Create sheets
    for sheet_name in sheet_names:
        wb.create_sheet(title=sheet_name)

    # Ensure parent directory exists
    os.makedirs(os.path.dirname('{full_path}'), exist_ok=True)

    # Save the workbook
    wb.save('{full_path}')

    print(json.dumps({{
        "success": True,
        "message": "Excel workbook '{file_path}' created successfully with sheets: {', '.join(sheet_names)}",
        "file_path": "{file_path}",
        "sheets": {sheet_names}
    }}))
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": str(e)
    }}))
"""
            
            script = self._create_excel_script(script_content)
            return await self._execute_excel_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error creating workbook: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "write_data",
            "description": "Write data to specific cells in a worksheet. Supports writing single values, ranges, or bulk data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the Excel file, relative to /workspace"
                    },
                    "sheet_name": {
                        "type": "string",
                        "description": "Name of the worksheet to write to"
                    },
                    "cell_range": {
                        "type": "string",
                        "description": "Cell range to write to (e.g., 'A1', 'A1:C3', 'B2:D10')"
                    },
                    "data": {
                        "type": "array",
                        "items": {"type": "array"},
                        "description": "2D array of data to write. For single cell, use [[value]]. For row, use [[val1, val2, val3]]. For multiple rows, use [[row1_val1, row1_val2], [row2_val1, row2_val2]]"
                    }
                },
                "required": ["file_path", "sheet_name", "cell_range", "data"]
            }
        }
    })
    @xml_schema(
        tag_name="write-data",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "sheet_name", "node_type": "attribute", "path": "sheet_name"},
            {"param_name": "cell_range", "node_type": "attribute", "path": "cell_range"},
            {"param_name": "data", "node_type": "element", "path": "data"}
        ],
        example='''
        <function_calls>
        <invoke name="write_data">
        <parameter name="file_path">data/sales_report.xlsx</parameter>
        <parameter name="sheet_name">Sales</parameter>
        <parameter name="cell_range">A1:C2</parameter>
        <parameter name="data">[["Name", "Sales", "Commission"], ["John", 1000, 100]]</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def write_data(self, file_path: str, sheet_name: str, cell_range: str, data: List[List[Any]]) -> ToolResult:
        """Write data to cells in a worksheet."""
        try:
            await self._ensure_sandbox()
            await self._ensure_openpyxl_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Load or create workbook
    if os.path.exists('{full_path}'):
        wb = load_workbook('{full_path}')
    else:
        wb = Workbook()
        
    # Get or create worksheet
    if '{sheet_name}' in wb.sheetnames:
        ws = wb['{sheet_name}']
    else:
        ws = wb.create_sheet(title='{sheet_name}')
    
    # Parse cell range and write data
    data = {data}
    cell_range = '{cell_range}'
    
    if ':' in cell_range:
        # Range of cells
        start_cell, end_cell = cell_range.split(':')
        start_row = int(''.join(filter(str.isdigit, start_cell)))
        start_col = column_index_from_string(''.join(filter(str.isalpha, start_cell)))
        
        # Write data row by row
        for row_idx, row_data in enumerate(data):
            for col_idx, value in enumerate(row_data):
                cell = ws.cell(row=start_row + row_idx, column=start_col + col_idx)
                cell.value = value
    else:
        # Single cell
        cell = ws[cell_range]
        if data and data[0]:
            cell.value = data[0][0]
    
    # Save workbook
    wb.save('{full_path}')
    
    print(json.dumps({{
        "success": True,
        "message": "Data written to {{}} in sheet '{sheet_name}'".format(cell_range),
        "file_path": "{file_path}",
        "sheet": "{sheet_name}",
        "range": cell_range
    }}))
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": str(e)
    }}))
"""
            
            script = self._create_excel_script(script_content)
            return await self._execute_excel_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error writing data: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "read_data", 
            "description": "Read data from specific cells or ranges in a worksheet.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the Excel file, relative to /workspace"
                    },
                    "sheet_name": {
                        "type": "string",
                        "description": "Name of the worksheet to read from"
                    },
                    "cell_range": {
                        "type": "string",
                        "description": "Cell range to read (e.g., 'A1', 'A1:C10', 'B:B' for entire column)"
                    }
                },
                "required": ["file_path", "sheet_name", "cell_range"]
            }
        }
    })
    @xml_schema(
        tag_name="read-data",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "sheet_name", "node_type": "attribute", "path": "sheet_name"},
            {"param_name": "cell_range", "node_type": "attribute", "path": "cell_range"}
        ],
        example='''
        <function_calls>
        <invoke name="read_data">
        <parameter name="file_path">data/sales_report.xlsx</parameter>
        <parameter name="sheet_name">Sales</parameter>
        <parameter name="cell_range">A1:C10</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def read_data(self, file_path: str, sheet_name: str, cell_range: str) -> ToolResult:
        """Read data from cells in a worksheet."""
        try:
            await self._ensure_sandbox()
            await self._ensure_openpyxl_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Load workbook
    wb = load_workbook('{full_path}')
    
    if '{sheet_name}' not in wb.sheetnames:
        print(json.dumps({{
            "success": False,
            "error": "Sheet '{sheet_name}' does not exist"
        }}))
    else:
        ws = wb['{sheet_name}']
        
        # Read data from range
        data = []
        for row in ws['{cell_range}']:
            if isinstance(row, tuple):
                row_data = [cell.value for cell in row]
            else:
                row_data = [row.value]
            data.append(row_data)
        
        print(json.dumps({{
            "success": True,
            "data": data,
            "range": "{cell_range}",
            "sheet": "{sheet_name}",
            "rows": len(data),
            "columns": len(data[0]) if data else 0
        }}))
        
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": str(e)
    }}))
"""
            
            script = self._create_excel_script(script_content)
            return await self._execute_excel_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error reading data: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "list_sheets",
            "description": "List all worksheets in an Excel workbook.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the Excel file, relative to /workspace"
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="list-sheets",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."}
        ],
        example='''
        <function_calls>
        <invoke name="list_sheets">
        <parameter name="file_path">data/sales_report.xlsx</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def list_sheets(self, file_path: str) -> ToolResult:
        """List all worksheets in a workbook."""
        try:
            await self._ensure_sandbox()
            await self._ensure_openpyxl_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Load workbook
    wb = load_workbook('{full_path}')
    sheets = [sheet.title for sheet in wb.worksheets]
    
    print(json.dumps({{
        "success": True,
        "sheets": sheets,
        "count": len(sheets),
        "file_path": "{file_path}"
    }}))
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": str(e)
    }}))
"""
            
            script = self._create_excel_script(script_content)
            return await self._execute_excel_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error listing sheets: {str(e)}") 