from typing import Optional, Dict, Any, List, Union
import json
import uuid
import os
from agentpress.tool import ToolResult, openapi_schema, xml_schema
from sandbox.tool_base import SandboxToolsBase
from agentpress.thread_manager import ThreadManager
from utils.logger import logger

class SandboxPDFFormTool(SandboxToolsBase):
    """Tool for PDF form operations using PyPDFForm in sandbox containers."""

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

    def _create_pdf_script(self, script_content: str) -> str:
        """Create a Python script that includes necessary imports and the provided content."""
        imports = """
import sys
import json
import uuid
import os
from PyPDFForm import PdfWrapper

"""
        return imports + script_content

    async def _ensure_pypdfform_installed(self):
        """Ensure PyPDFForm is installed in the sandbox"""
        try:
            # Check if PyPDFForm is available
            response = self.sandbox.process.exec("python3 -c 'import PyPDFForm; print(PyPDFForm.__version__)'", timeout=10)
            if response.exit_code != 0:
                # Install PyPDFForm if not available
                logger.info("Installing PyPDFForm in sandbox...")
                install_response = self.sandbox.process.exec("pip install --no-cache-dir PyPDFForm==1.4.36", timeout=120)
                if install_response.exit_code != 0:
                    raise Exception(f"Failed to install PyPDFForm: {install_response.result}")
                logger.info("Successfully installed PyPDFForm")
            else:
                logger.debug("PyPDFForm already available in sandbox")
                    
        except Exception as e:
            logger.warning(f"Could not verify PyPDFForm installation: {e}")

    async def _ensure_pymupdf_installed(self):
        """Ensure PyMuPDF is installed in the sandbox"""
        try:
            response = self.sandbox.process.exec("python3 -c 'import pymupdf; print(pymupdf.__version__)'", timeout=10)
            if response.exit_code != 0:
                logger.info("Installing PyMuPDF in sandbox...")
                install_response = self.sandbox.process.exec("pip install --no-cache-dir PyMuPDF==1.24.4", timeout=120)
                if install_response.exit_code != 0:
                    raise Exception(f"Failed to install PyMuPDF: {install_response.result}")
                logger.info("Successfully installed PyMuPDF")
            else:
                logger.debug("PyMuPDF already available in sandbox")
        except Exception as e:
            logger.warning(f"Could not verify PyMuPDF installation: {e}")

    def _get_default_field_positions(self) -> Dict[str, Dict[str, Any]]:
        """Get default field positions for common form layouts"""
        return {
            # Common text fields
            "name": {"x": 150, "y": 200, "fontsize": 10, "type": "text"},
            "first_name": {"x": 150, "y": 200, "fontsize": 10, "type": "text"},
            "last_name": {"x": 350, "y": 200, "fontsize": 10, "type": "text"},
            "date": {"x": 450, "y": 200, "fontsize": 10, "type": "text"},
            "today": {"x": 450, "y": 200, "fontsize": 10, "type": "text"},
            
            # Address fields
            "address": {"x": 150, "y": 250, "fontsize": 10, "type": "text"},
            "street": {"x": 150, "y": 250, "fontsize": 10, "type": "text"},
            "city": {"x": 150, "y": 300, "fontsize": 10, "type": "text"},
            "state": {"x": 350, "y": 300, "fontsize": 10, "type": "text"},
            "zip": {"x": 450, "y": 300, "fontsize": 10, "type": "text"},
            "zipcode": {"x": 450, "y": 300, "fontsize": 10, "type": "text"},
            "postal_code": {"x": 450, "y": 300, "fontsize": 10, "type": "text"},
            
            # Contact fields
            "phone": {"x": 150, "y": 350, "fontsize": 10, "type": "text"},
            "email": {"x": 150, "y": 400, "fontsize": 10, "type": "text"},
            
            # Financial fields
            "amount": {"x": 450, "y": 400, "fontsize": 10, "type": "text"},
            "total": {"x": 450, "y": 400, "fontsize": 10, "type": "text"},
            "salary": {"x": 450, "y": 400, "fontsize": 10, "type": "text"},
            
            # Signature field
            "signature": {"x": 150, "y": 500, "fontsize": 12, "type": "text"},
            "sign": {"x": 150, "y": 500, "fontsize": 12, "type": "text"},
            
            # Common checkboxes
            "agree": {"x": 100, "y": 450, "fontsize": 14, "type": "checkbox"},
            "consent": {"x": 100, "y": 450, "fontsize": 14, "type": "checkbox"},
            "checkbox": {"x": 100, "y": 450, "fontsize": 14, "type": "checkbox"},
            "check": {"x": 100, "y": 450, "fontsize": 14, "type": "checkbox"},
        }

    async def _execute_pdf_script(self, script: str, timeout: int = 30) -> ToolResult:
        """Execute a Python script in the sandbox and return the result"""
        try:
            # Save script to a temporary file in sandbox
            script_file = f"/workspace/temp_pdf_script_{hash(script) % 10000}.py"
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
            return self.fail_response(f"Error executing PDF script: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "read_form_fields",
            "description": "Reads fillable form fields from interactive PDF forms only. Use this to discover what fields are available in PDFs with form controls. IMPORTANT: This only works with PDFs that have actual form fields - will return empty results for scanned documents or image-based PDFs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file, relative to /workspace (e.g., 'forms/application.pdf')"
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="read-form-fields",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."}
        ],
        example='''
        <function_calls>
        <invoke name="read_form_fields">
        <parameter name="file_path">forms/application.pdf</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def read_form_fields(self, file_path: str) -> ToolResult:
        """Reads the fillable form fields from a PDF file."""
        try:
            # Ensure sandbox is initialized and dependencies are available
            await self._ensure_sandbox()
            await self._ensure_pypdfform_installed()
            
            # Clean and validate the file path
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            # Create Python script to execute in sandbox
            script_content = f"""
import json
from PyPDFForm import PdfWrapper

try:
    # Load PDF form
    wrapper = PdfWrapper('{full_path}')
    
    # Get form schema
    schema = wrapper.schema
    
    # Get field names from schema
    field_names = list(schema.get('properties', {{}}).keys()) if schema else []
    
    # Build detailed field information from schema
    field_details = {{}}
    properties = schema.get('properties', {{}}) if schema else {{}}
    for field_name in field_names:
        field_info = properties.get(field_name, {{}})
        field_type = field_info.get('type', 'string')
        field_details[field_name] = {{'type': field_type}}
    
    result = {{
        "success": True,
        "message": "Successfully read form fields from {file_path}",
        "file_path": "{file_path}",
        "field_count": len(field_names),
        "field_names": field_names,
        "field_details": field_details,
        "schema": schema
    }}
    
    print(json.dumps(result))
    
except Exception as e:
    error_result = {{
        "success": False,
        "error": f"Error reading form fields: {{str(e)}}"
    }}
    print(json.dumps(error_result))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error reading form fields: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "fill_form",
            "description": "Fills interactive PDF forms with fillable fields only. IMPORTANT: Use this ONLY for PDFs with actual form controls. For scanned documents, image-based PDFs, or non-fillable forms, use fill_form_coordinates instead. This will fail if the PDF doesn't have interactive form fields.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF form file, relative to /workspace"
                    },
                    "fields": {
                        "type": "object",
                        "description": "Dictionary where keys are field names and values are field values. Text fields use strings, checkboxes use booleans (true/false), radio buttons and dropdowns use integers (0-based index)."
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output path for the filled form. If not provided, will create a file with '_filled' suffix."
                    }
                },
                "required": ["file_path", "fields"]
            }
        }
    })
    @xml_schema(
        tag_name="fill-form",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "fields", "node_type": "element", "path": "fields"},
            {"param_name": "output_path", "node_type": "attribute", "path": "output_path", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="fill_form">
        <parameter name="file_path">forms/application.pdf</parameter>
        <parameter name="fields">{
            "name": "John Doe",
            "email": "john@example.com",
            "subscribe": true,
            "country": 2
        }</parameter>
        <parameter name="output_path">forms/application_filled.pdf</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def fill_form(self, file_path: str, fields: Dict[str, Any], output_path: Optional[str] = None) -> ToolResult:
        """Fill a PDF form with the provided field values."""
        try:
            await self._ensure_sandbox()
            await self._ensure_pypdfform_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            # Determine output path
            if output_path:
                output_path = self.clean_path(output_path)
                filled_path = f"{self.workspace_path}/{output_path}"
            else:
                # Generate output path with _filled suffix
                base_name = os.path.splitext(file_path)[0]
                filled_path = f"{self.workspace_path}/{base_name}_filled_{uuid.uuid4().hex[:8]}.pdf"
                output_path = filled_path.replace(f"{self.workspace_path}/", "")
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Load PDF form
    wrapper = PdfWrapper('{full_path}')
    
    # Fill the form with provided fields
    fields_to_fill = {json.dumps(fields)}
    filled_pdf_stream = wrapper.fill(fields_to_fill, flatten=False)
    
    # Ensure parent directory exists
    os.makedirs(os.path.dirname('{filled_path}'), exist_ok=True)
    
    # Save the filled form
    with open('{filled_path}', 'wb') as output_file:
        output_file.write(filled_pdf_stream.read())
    
    print(json.dumps({{
        "success": True,
        "message": "Successfully filled PDF form and saved to '{output_path}'",
        "input_file": "{file_path}",
        "output_file": "{output_path}",
        "fields_filled": len(fields_to_fill)
    }}))
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": f"Error filling form: {{str(e)}}"
    }}))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error filling form: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "get_form_field_value",
            "description": "Get the current value of a specific field in a PDF form.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file, relative to /workspace"
                    },
                    "field_name": {
                        "type": "string",
                        "description": "Name of the field to get the value from"
                    }
                },
                "required": ["file_path", "field_name"]
            }
        }
    })
    @xml_schema(
        tag_name="get-form-field-value",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "field_name", "node_type": "attribute", "path": "field_name"}
        ],
        example='''
        <function_calls>
        <invoke name="get_form_field_value">
        <parameter name="file_path">forms/application.pdf</parameter>
        <parameter name="field_name">email</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def get_form_field_value(self, file_path: str, field_name: str) -> ToolResult:
        """Get the value of a specific field in a PDF form."""
        try:
            await self._ensure_sandbox()
            await self._ensure_pypdfform_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Load PDF form
    wrapper = PdfWrapper('{full_path}')
    
    # Get schema and sample data
    schema = wrapper.schema
    field_values = wrapper.sample_data
    
    # Get specific field value
    field_value = field_values.get('{field_name}', None)
    
    # Check if field exists
    field_names = list(schema.get('properties', {{}}).keys()) if schema else []
    if '{field_name}' not in field_names:
        print(json.dumps({{
            "success": False,
            "error": f"Field '{field_name}' does not exist in the form"
        }}))
    else:
        print(json.dumps({{
            "success": True,
            "field_name": "{field_name}",
            "value": field_value,
            "file_path": "{file_path}"
        }}))
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": f"Error getting field value: {{str(e)}}"
    }}))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error getting field value: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "flatten_form",
            "description": "Flatten a filled PDF form to make it non-editable (converts form fields to static content).",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file to flatten, relative to /workspace"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output path for the flattened PDF. If not provided, will create a file with '_flattened' suffix."
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="flatten-form",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "output_path", "node_type": "attribute", "path": "output_path", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="flatten_form">
        <parameter name="file_path">forms/application_filled.pdf</parameter>
        <parameter name="output_path">forms/application_final.pdf</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def flatten_form(self, file_path: str, output_path: Optional[str] = None) -> ToolResult:
        """Flatten a PDF form to make it non-editable."""
        try:
            await self._ensure_sandbox()
            await self._ensure_pypdfform_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            # Determine output path
            if output_path:
                output_path = self.clean_path(output_path)
                flattened_path = f"{self.workspace_path}/{output_path}"
            else:
                # Generate output path with _flattened suffix
                base_name = os.path.splitext(file_path)[0]
                flattened_path = f"{self.workspace_path}/{base_name}_flattened_{uuid.uuid4().hex[:8]}.pdf"
                output_path = flattened_path.replace(f"{self.workspace_path}/", "")
            
            # Create Python script to execute in sandbox
            script_content = f"""
try:
    # Load PDF form
    wrapper = PdfWrapper('{full_path}')
    
    # Flatten the form
    # First check if the PDF has any fillable fields
    schema = wrapper.schema
    
    if not schema or not schema.get('properties'):
        print(json.dumps({{
            "success": False,
            "error": "No form fields found to flatten. This appears to be a non-form PDF."
        }}))
    else:
        # Create a flattened version by filling with current values and setting flatten=True
        current_values = wrapper.sample_data
        
        # Fill the form with current values and flatten it
        flattened_stream = wrapper.fill(current_values, flatten=True)
        
        # Ensure parent directory exists
        os.makedirs(os.path.dirname('{flattened_path}'), exist_ok=True)
        
        # Save the flattened form
        with open('{flattened_path}', 'wb') as output_file:
            output_file.write(flattened_stream.read())
        
        print(json.dumps({{
            "success": True,
            "message": "Successfully flattened PDF form and saved to '{output_path}'",
            "input_file": "{file_path}",
            "output_file": "{output_path}"
        }}))
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": f"Error flattening form: {{str(e)}}"
    }}))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error flattening form: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "fill_form_coordinates",
            "description": "Fill scanned PDFs or non-fillable documents using coordinate-based text overlay. Use this for: scanned documents, image-based PDFs, or any PDF without interactive form fields. Places text at specific X,Y positions on the page. IMPORTANT: For interactive PDFs with form fields, use fill_form instead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file, relative to /workspace"
                    },
                    "form_data": {
                        "type": "object",
                        "description": "Data to fill in the form. Field names should match coordinate template keys."
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output path for the filled form. If not provided, will create a file with '_filled' suffix."
                    },
                    "template_name": {
                        "type": "string",
                        "description": "Optional template name with predefined coordinates. If not provided, uses default field positions."
                    },
                    "custom_coordinates": {
                        "type": "object",
                        "description": "Optional custom field coordinates {field_name: {x: int, y: int, fontsize: int, type: 'text'|'checkbox'}}. Overrides template."
                    }
                },
                "required": ["file_path", "form_data"]
            }
        }
    })
    @xml_schema(
        tag_name="fill-form-coordinates",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "form_data", "node_type": "element", "path": "form_data"},
            {"param_name": "output_path", "node_type": "attribute", "path": "output_path", "required": False},
            {"param_name": "template_name", "node_type": "attribute", "path": "template_name", "required": False},
            {"param_name": "custom_coordinates", "node_type": "element", "path": "custom_coordinates", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="fill_form_coordinates">
        <parameter name="file_path">forms/scanned_form.pdf</parameter>
        <parameter name="form_data">{
            "name": "John Doe",
            "date": "01/15/2024",
            "email": "john@example.com"
        }</parameter>
        <parameter name="custom_coordinates">{
            "name": {"x": 150, "y": 200, "fontsize": 12, "type": "text"},
            "date": {"x": 400, "y": 200, "fontsize": 10, "type": "text"}
        }</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def fill_form_coordinates(self, file_path: str, form_data: Dict[str, Any], output_path: Optional[str] = None, template_name: Optional[str] = None, custom_coordinates: Optional[Dict[str, Dict[str, Any]]] = None) -> ToolResult:
        """Fill a PDF using coordinate-based text overlay (for scanned/non-fillable PDFs)."""
        try:
            await self._ensure_sandbox()
            await self._ensure_pymupdf_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            # Determine output path
            if output_path:
                output_path = self.clean_path(output_path)
                filled_path = f"{self.workspace_path}/{output_path}"
            else:
                base_name = os.path.splitext(file_path)[0]
                filled_path = f"{self.workspace_path}/{base_name}_coordinates_filled_{uuid.uuid4().hex[:8]}.pdf"
                output_path = filled_path.replace(f"{self.workspace_path}/", "")
            
            # Build coordinate mapping
            field_positions = {}
            
            # Start with defaults
            default_positions = self._get_default_field_positions()
            field_positions.update(default_positions)
            
            # Add template coordinates if provided
            if template_name:
                template_path = f"{self.workspace_path}/form_templates/{template_name}.json"
                if self._file_exists(template_path):
                    try:
                        template_content = self.sandbox.fs.get_file_info(template_path)
                        template_data = json.loads(template_content.get('content', '{}'))
                        template_coords = template_data.get('fields', {})
                        field_positions.update(template_coords)
                    except Exception as e:
                        logger.warning(f"Could not load template '{template_name}': {e}")
            
            # Custom coordinates override everything
            if custom_coordinates:
                field_positions.update(custom_coordinates)
            
            # Create coordinate filling script
            script_content = f"""
import pymupdf
import json
import os

def fill_pdf_coordinates(pdf_path, form_data, field_positions, output_path):
    '''Fill PDF using coordinate-based text overlay'''
    try:
        doc = pymupdf.open(pdf_path)
        filled_count = 0
        skipped_fields = []
        placed_positions = []
        
        if len(doc) == 0:
            raise Exception("PDF has no pages")
        
        # Process first page (can be extended for multi-page)
        page = doc[0]
        page_width = page.rect.width
        page_height = page.rect.height
        
        for field_name, value in form_data.items():
            if value is None or value == "":
                continue
                
            # Find position for this field
            position = None
            field_key = field_name.lower()
            
            # Direct match first
            if field_key in field_positions:
                position = field_positions[field_key]
            else:
                # Fuzzy match - check if any position key is contained in field name or vice versa
                for pos_key, pos_data in field_positions.items():
                    if pos_key in field_key or field_key in pos_key:
                        position = pos_data
                        break
            
            if position:
                field_type = position.get('type', 'text')
                x = position.get('x', 100)
                y = position.get('y', 100)
                fontsize = position.get('fontsize', 10)
                
                # Validate and adjust coordinates
                if x < 0:
                    x = 10
                elif x > page_width - 50:
                    x = page_width - 50
                    
                if y < 0:
                    y = 20
                elif y > page_height - 20:
                    y = page_height - 20
                
                # Validate font size
                if fontsize < 6:
                    fontsize = 6
                elif fontsize > 24:
                    fontsize = 24
                
                try:
                    if field_type == 'checkbox' and isinstance(value, bool):
                        if value:
                            page.insert_text(
                                (x, y),
                                "✓",
                                fontsize=fontsize,
                                color=(0, 0, 0)
                            )
                            filled_count += 1
                            placed_positions.append({{
                                "field": field_name,
                                "x": x,
                                "y": y,
                                "value": "✓",
                                "type": "checkbox"
                            }})
                    else:
                        # Text field - limit length and handle line breaks
                        text_value = str(value)
                        if len(text_value) > 60:  # Truncate very long text
                            text_value = text_value[:57] + "..."
                        
                        page.insert_text(
                            (x, y),
                            text_value,
                            fontsize=fontsize,
                            color=(0, 0, 0)
                        )
                        filled_count += 1
                        placed_positions.append({{
                            "field": field_name,
                            "x": x,
                            "y": y,
                            "value": text_value,
                            "type": "text"
                        }})
                        
                except Exception as e:
                    skipped_fields.append(f"{{field_name}}: {{str(e)}}")
            else:
                skipped_fields.append(f"{{field_name}}: no position found")
        
        # Save the filled PDF
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.save(output_path)
        doc.close()
        
        return filled_count, skipped_fields, placed_positions
        
    except Exception as e:
        raise Exception(f"Error in coordinate filling: {{str(e)}}")

# Main execution
input_path = '{full_path}'
form_data = {json.dumps(form_data)}
field_positions = {json.dumps(field_positions)}
output_path = '{filled_path}'

try:
    filled_count, skipped_fields, placed_positions = fill_pdf_coordinates(
        input_path, form_data, field_positions, output_path
    )
    
    result = {{
        "success": True,
        "method": "coordinate_overlay",
        "message": f"Filled {{filled_count}} fields using coordinate-based overlay",
        "output_path": "{output_path}",
        "input_file": "{file_path}",
        "fields_filled": filled_count,
        "fields_skipped": len(skipped_fields),
        "skipped_fields": skipped_fields,
        "placed_positions": placed_positions,
        "total_fields_attempted": len(form_data)
    }}
    
    print(json.dumps(result))
    
except Exception as e:
    error_result = {{
        "success": False,
        "error": f"Error filling form with coordinates: {{str(e)}}"
    }}
    print(json.dumps(error_result))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script, timeout=60)
            
        except Exception as e:
            return self.fail_response(f"Error in coordinate-based form filling: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "analyze_form_layout",
            "description": "Analyze scanned PDFs or non-fillable documents to find field positions for coordinate-based filling. Use this FIRST when working with scanned documents to identify where form fields should be placed. Returns suggested X,Y coordinates for text placement. Essential for fill_form_coordinates workflow.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file to analyze"
                    },
                    "page_number": {
                        "type": "integer",
                        "description": "Page number to analyze (0-indexed)",
                        "default": 0
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="analyze-form-layout",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "page_number", "node_type": "attribute", "path": "page_number", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="analyze_form_layout">
        <parameter name="file_path">forms/application.pdf</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def analyze_form_layout(self, file_path: str, page_number: int = 0) -> ToolResult:
        """Analyze PDF layout to help identify field positions for coordinate-based filling."""
        try:
            await self._ensure_sandbox()
            await self._ensure_pymupdf_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            script_content = f"""
import pymupdf
import json

try:
    doc = pymupdf.open('{full_path}')
    
    if len(doc) <= {page_number}:
        print(json.dumps({{
            "success": False,
            "error": f"Page {{page_number}} does not exist. Document has {{len(doc)}} pages."
        }}))
    else:
        page = doc[{page_number}]
        
        # Extract text with coordinates
        text_instances = []
        potential_fields = []
        
        # Get text blocks with positions
        for block in page.get_text("dict")["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if len(text) > 0:
                            bbox = span["bbox"]
                            text_instances.append({{
                                "text": text,
                                "x": round(bbox[0]),
                                "y": round(bbox[1]),
                                "width": round(bbox[2] - bbox[0]),
                                "height": round(bbox[3] - bbox[1])
                            }})
        
        # Find potential field labels and suggest fill positions
        keywords = [
            "name", "first", "last", "date", "address", "street", "city", "state", "zip", 
            "phone", "email", "signature", "amount", "total", "salary", "agree", "consent",
            "checkbox", "check", "sign", "today", "birth", "age", "gender", "occupation"
        ]
        
        for item in text_instances:
            text_lower = item["text"].lower()
            for keyword in keywords:
                if keyword in text_lower and len(item["text"]) < 30:  # Likely a label, not content
                    # Calculate suggested fill position (to the right of the label)
                    fill_x = item["x"] + item["width"] + 10
                    fill_y = item["y"] + item["height"] - 2  # Slightly lower for better alignment
                    
                    potential_fields.append({{
                        "label_text": item["text"],
                        "keyword": keyword,
                        "label_position": {{"x": item["x"], "y": item["y"]}},
                        "suggested_fill_position": {{"x": fill_x, "y": fill_y}},
                        "confidence": "high" if keyword == text_lower.strip() else "medium"
                    }})
                    break
        
        # Remove duplicates and sort by Y position (top to bottom)
        unique_fields = []
        seen_positions = set()
        for field in sorted(potential_fields, key=lambda x: x["suggested_fill_position"]["y"]):
            pos_key = (field["suggested_fill_position"]["x"], field["suggested_fill_position"]["y"])
            if pos_key not in seen_positions:
                unique_fields.append(field)
                seen_positions.add(pos_key)
        
        print(json.dumps({{
            "success": True,
            "file_path": "{file_path}",
            "page_number": {page_number},
            "page_size": {{"width": round(page.rect.width), "height": round(page.rect.height)}},
            "total_text_elements": len(text_instances),
            "potential_fields": unique_fields[:15],  # Limit to top 15 matches
            "sample_text": text_instances[:5]  # First 5 text elements for reference
        }}))
        
    doc.close()
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": f"Error analyzing layout: {{str(e)}}"
    }}))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error analyzing form layout: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_coordinate_template",
            "description": "Create a reusable template with field coordinates for consistent form filling.",
            "parameters": {
                "type": "object",
                "properties": {
                    "template_name": {
                        "type": "string",
                        "description": "Name for this template (e.g., 'tax_form_1040', 'job_application')"
                    },
                    "field_coordinates": {
                        "type": "object",
                        "description": "Dictionary mapping field names to their positions {field_name: {x: int, y: int, fontsize: int, type: 'text'|'checkbox'}}"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description of what this template is for",
                        "default": ""
                    }
                },
                "required": ["template_name", "field_coordinates"]
            }
        }
    })
    @xml_schema(
        tag_name="create-coordinate-template",
        mappings=[
            {"param_name": "template_name", "node_type": "attribute", "path": "."},
            {"param_name": "field_coordinates", "node_type": "element", "path": "field_coordinates"},
            {"param_name": "description", "node_type": "attribute", "path": "description", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="create_coordinate_template">
        <parameter name="template_name">job_application</parameter>
        <parameter name="field_coordinates">{
            "name": {"x": 150, "y": 200, "fontsize": 10, "type": "text"},
            "date": {"x": 400, "y": 200, "fontsize": 10, "type": "text"},
            "agree": {"x": 100, "y": 450, "fontsize": 14, "type": "checkbox"}
        }</parameter>
        <parameter name="description">Standard job application form template</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def create_coordinate_template(self, template_name: str, field_coordinates: Dict[str, Dict[str, Any]], description: str = "") -> ToolResult:
        """Create and save a coordinate template for reusable form filling."""
        try:
            await self._ensure_sandbox()
            
            # Validate template name
            if not template_name or not template_name.replace('_', '').replace('-', '').isalnum():
                return self.fail_response("Template name must contain only letters, numbers, hyphens, and underscores")
            
            # Validate field coordinates
            if not field_coordinates or not isinstance(field_coordinates, dict):
                return self.fail_response("Field coordinates must be a non-empty dictionary")
            
            template_path = f"{self.workspace_path}/form_templates/{template_name}.json"
            
            script_content = f"""
import json
import os
from datetime import datetime

# Validate and normalize field coordinates
field_coords = {json.dumps(field_coordinates)}
normalized_coords = {{}}

for field_name, coords in field_coords.items():
    if not isinstance(coords, dict):
        continue
        
    # Ensure required fields with defaults
    normalized_coords[field_name.lower()] = {{
        "x": int(coords.get("x", 100)),
        "y": int(coords.get("y", 100)),
        "fontsize": int(coords.get("fontsize", 10)),
        "type": coords.get("type", "text")
    }}
    
    # Validate ranges
    if normalized_coords[field_name.lower()]["fontsize"] < 6:
        normalized_coords[field_name.lower()]["fontsize"] = 6
    elif normalized_coords[field_name.lower()]["fontsize"] > 24:
        normalized_coords[field_name.lower()]["fontsize"] = 24

template_data = {{
    "name": "{template_name}",
    "description": "{description}",
    "created": datetime.now().isoformat(),
    "version": "1.0",
    "fields": normalized_coords
}}

# Create directory if needed
os.makedirs(os.path.dirname('{template_path}'), exist_ok=True)

# Save template
with open('{template_path}', 'w') as f:
    json.dump(template_data, f, indent=2)

result = {{
    "success": True,
    "message": "Template '{template_name}' created successfully",
    "template_path": '{template_path}'.replace('{self.workspace_path}/', ''),
    "field_count": len(normalized_coords),
    "fields": list(normalized_coords.keys())
}}

print(json.dumps(result))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error creating template: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "generate_coordinate_grid",
            "description": "Generate visual coordinate grid overlay on PDFs to help identify exact X,Y positions for field placement. Use this as a visual aid when working with scanned documents to determine precise coordinates for fill_form_coordinates. Helpful for creating custom coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file to add grid to"
                    },
                    "grid_spacing": {
                        "type": "integer",
                        "description": "Major grid spacing in points. Use 10-25 for precise work, 50 for general use",
                        "default": 25
                    },
                    "fine_grid": {
                        "type": "boolean",
                        "description": "Add fine grid lines between major lines for extra precision",
                        "default": True
                    },
                    "coordinate_labels": {
                        "type": "boolean", 
                        "description": "Show coordinate numbers at grid intersections",
                        "default": True
                    },
                    "crosshairs": {
                        "type": "boolean",
                        "description": "Add crosshair markers for precise targeting",
                        "default": False
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output path. If not provided, will add '_grid' suffix."
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="generate-coordinate-grid",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "grid_spacing", "node_type": "attribute", "path": "grid_spacing", "required": False},
            {"param_name": "fine_grid", "node_type": "attribute", "path": "fine_grid", "required": False},
            {"param_name": "coordinate_labels", "node_type": "attribute", "path": "coordinate_labels", "required": False},
            {"param_name": "crosshairs", "node_type": "attribute", "path": "crosshairs", "required": False},
            {"param_name": "output_path", "node_type": "attribute", "path": "output_path", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="generate_coordinate_grid">
        <parameter name="file_path">forms/application.pdf</parameter>
        <parameter name="grid_spacing">10</parameter>
        <parameter name="fine_grid">true</parameter>
        <parameter name="coordinate_labels">true</parameter>
        <parameter name="crosshairs">true</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def generate_coordinate_grid(self, file_path: str, grid_spacing: int = 25, fine_grid: bool = True, coordinate_labels: bool = True, crosshairs: bool = False, output_path: Optional[str] = None) -> ToolResult:
        """Generate a precision coordinate grid overlay on PDF to help identify field positions."""
        try:
            await self._ensure_sandbox()
            await self._ensure_pymupdf_installed()
            
            file_path = self.clean_path(file_path)
            full_path = f"{self.workspace_path}/{file_path}"
            
            if not self._file_exists(full_path):
                return self.fail_response(f"PDF file '{file_path}' does not exist")
            
            # Determine output path
            if output_path:
                output_path = self.clean_path(output_path)
                grid_path = f"{self.workspace_path}/{output_path}"
            else:
                base_name = os.path.splitext(file_path)[0]
                spacing_suffix = f"_grid_{grid_spacing}pt"
                if fine_grid:
                    spacing_suffix += "_fine"
                grid_path = f"{self.workspace_path}/{base_name}{spacing_suffix}.pdf"
                output_path = grid_path.replace(f"{self.workspace_path}/", "")
            
            script_content = f"""
import pymupdf
import json
import os

try:
    doc = pymupdf.open('{full_path}')
    grid_spacing = {grid_spacing}
    fine_grid = {fine_grid}
    coordinate_labels = {coordinate_labels}
    crosshairs = {crosshairs}
    
    # Process first page
    if len(doc) > 0:
        page = doc[0]
        width = page.rect.width
        height = page.rect.height
        
        # Colors
        major_color = (0.6, 0.6, 0.6)  # Darker gray for major lines
        fine_color = (0.8, 0.8, 0.8)   # Lighter gray for fine lines
        label_color = (0, 0, 0.8)       # Blue for labels
        crosshair_color = (1, 0, 0)     # Red for crosshairs
        
        # Calculate fine grid spacing (5 subdivisions)
        fine_spacing = grid_spacing // 5 if fine_grid and grid_spacing >= 10 else grid_spacing
        
        # Draw fine grid first (if enabled)
        if fine_grid and fine_spacing < grid_spacing:
            # Vertical fine lines
            for x in range(0, int(width), fine_spacing):
                if x % grid_spacing != 0:  # Skip major grid positions
                    page.draw_line((x, 0), (x, height), width=0.3, color=fine_color)
            
            # Horizontal fine lines  
            for y in range(0, int(height), fine_spacing):
                if y % grid_spacing != 0:  # Skip major grid positions
                    page.draw_line((0, y), (width, y), width=0.3, color=fine_color)
        
        # Draw major grid lines
        major_positions_x = []
        major_positions_y = []
        
        # Vertical major lines
        for x in range(0, int(width), grid_spacing):
            page.draw_line((x, 0), (x, height), width=0.8, color=major_color)
            major_positions_x.append(x)
        
        # Horizontal major lines
        for y in range(0, int(height), grid_spacing):
            page.draw_line((0, y), (width, y), width=0.8, color=major_color)
            major_positions_y.append(y)
        
        # Add coordinate labels at major intersections
        if coordinate_labels:
            for x in major_positions_x:
                for y in major_positions_y:
                    if x > 0 and y > 20:  # Skip edges and top area
                        # X coordinate label (horizontal)
                        if y == major_positions_y[1] if len(major_positions_y) > 1 else y:  # Second row
                            page.insert_text((x + 2, y - 8), f"{{x}}", fontsize=7, color=label_color)
                        
                        # Y coordinate label (vertical) 
                        if x == major_positions_x[1] if len(major_positions_x) > 1 else x:  # Second column
                            page.insert_text((x - 15, y - 2), f"{{y}}", fontsize=7, color=label_color)
        
        # Add crosshairs at major intersections for precision targeting
        if crosshairs:
            crosshair_size = 5
            for x in major_positions_x[1::2]:  # Every other intersection
                for y in major_positions_y[1::2]:
                    if x > crosshair_size and y > crosshair_size and x < width - crosshair_size and y < height - crosshair_size:
                        # Draw crosshair
                        page.draw_line((x - crosshair_size, y), (x + crosshair_size, y), width=1, color=crosshair_color)
                        page.draw_line((x, y - crosshair_size), (x, y + crosshair_size), width=1, color=crosshair_color)
                        
                        # Add precise coordinate label
                        page.insert_text((x + crosshair_size + 2, y + 2), f"({{x}},{{y}})", fontsize=6, color=crosshair_color)
        
        # Add enhanced instructions
        instructions_bg = pymupdf.Rect(5, 5, 250, 85)
        page.draw_rect(instructions_bg, color=(1, 1, 1), fill=(1, 1, 1), width=1)
        
        instructions = [
            "PRECISION COORDINATE GRID",
            f"Major grid: {{grid_spacing}}pt spacing",
            f"Fine grid: {{'ON' if fine_grid else 'OFF'}} ({{fine_spacing}}pt)" if fine_grid else f"Fine grid: OFF",
            f"Labels: {{'ON' if coordinate_labels else 'OFF'}}",
            f"Crosshairs: {{'ON' if crosshairs else 'OFF'}}",
            "Page size: {{int(width)}} x {{int(height)}} pts",
            "Use coordinates for fill_form_coordinates"
        ]
        
        for i, instruction in enumerate(instructions):
            font_size = 9 if i == 0 else 8
            color = (0, 0, 0.6) if i == 0 else (0.2, 0.2, 0.2)
            page.insert_text((8, 18 + i * 10), instruction, fontsize=font_size, color=color)
    
    # Save the grid overlay PDF
    os.makedirs(os.path.dirname('{grid_path}'), exist_ok=True)
    doc.save('{grid_path}')
    doc.close()
    
    print(json.dumps({{
        "success": True,
        "message": "Precision coordinate grid generated successfully",
        "output_path": "{output_path}",
        "grid_spacing": grid_spacing,
        "fine_grid_spacing": fine_spacing if fine_grid else None,
        "features": {{
            "fine_grid": fine_grid,
            "coordinate_labels": coordinate_labels,
            "crosshairs": crosshairs
        }},
        "page_size": {{"width": round(width), "height": round(height)}},
        "precision_level": "high" if grid_spacing <= 10 else "medium" if grid_spacing <= 25 else "standard"
    }}))
    
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": f"Error generating grid: {{str(e)}}"
    }}))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error generating coordinate grid: {str(e)}") 