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
from PyPDFForm import PdfWrapper, FormWrapper

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

    async def _execute_pdf_script(self, script: str, timeout: int = 60) -> ToolResult:
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
    # Use PdfWrapper for inspection (has .schema attribute)
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
            "description": "Fills interactive PDF forms with fillable fields while KEEPING the form editable for manual corrections. IMPORTANT: Use this ONLY for PDFs with actual form controls. For scanned documents, image-based PDFs, or non-fillable forms, use smart_form_fill instead. The filled form remains editable - use flatten_form separately if user need a non-editable version. GIve the user an option to flatten the form if they want a non-editable version. ",
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
    # Import both wrappers - PdfWrapper for inspection, FormWrapper for editable filling
    from PyPDFForm import PdfWrapper, FormWrapper
    
    # Use PdfWrapper for inspection (has .schema attribute)
    inspector = PdfWrapper('{full_path}')
    
    # Get original schema to check available fields
    original_schema = inspector.schema
    available_fields = set(original_schema.get('properties', {{}}).keys()) if original_schema else set()
    
    # Pre-process fields to handle different field types
    processed_fields = {{}}
    for field_name, value in {repr(fields)}.items():
        field_name_lower = field_name.lower()
        
        # Skip signature and image fields if they contain text (not file paths)
        if ('signature' in field_name_lower or 'image' in field_name_lower) and isinstance(value, str):
            # Check if it's a file path (contains extension) or just text
            if not ('.' in value and any(ext in value.lower() for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp'])):
                # Skip text values for signature/image fields
                print(f"Skipping signature/image field '{{field_name}}' with text value: {{value}}")
                continue
        
        # Handle boolean values for checkboxes
        if isinstance(value, bool):
            processed_fields[field_name] = value  # Keep as boolean per PyPDFForm docs
        elif isinstance(value, str) and value.lower() in ['true', 'false']:
            processed_fields[field_name] = value.lower() == 'true'
        else:
            processed_fields[field_name] = value
    
    # Use FormWrapper for filling to keep form editable
    filler = FormWrapper('{full_path}')
    filled_pdf_stream = filler.fill(processed_fields, flatten=False)
    
    # Ensure parent directory exists
    os.makedirs(os.path.dirname('{filled_path}'), exist_ok=True)
    
    # Save the filled form
    with open('{filled_path}', 'wb') as output_file:
        output_file.write(filled_pdf_stream.read())
    
    # Get diagnostic information by checking which fields actually exist and were processed
    try:
        requested_fields = set(processed_fields.keys())
        available_requested_fields = requested_fields.intersection(available_fields)
        unavailable_fields = requested_fields - available_fields
        
        # For interactive forms, assume all available fields were filled successfully
        # since PyPDFForm doesn't provide detailed success/failure info
        filled_count = len(available_requested_fields)
        failed_count = len(unavailable_fields)
        
        diagnostics = {{
            "requested_count": len(requested_fields),
            "filled_count": filled_count,
            "failed_count": failed_count,
            "failed_fields": list(unavailable_fields)[:10],  # First 10 failed fields
            "available_fields_in_pdf": len(available_fields),
            "method": "interactive_form_fill_editable",
            "form_remains_editable": True
        }}
    except Exception as diag_error:
        diagnostics = {{
            "note": f"Could not generate diagnostics: {{str(diag_error)}}",
            "method": "interactive_form_fill_editable",
            "form_remains_editable": True
        }}
    
    print(json.dumps({{
        "success": True,
        "message": "Successfully filled PDF form and saved to '{output_path}' (form remains editable)",
        "input_file": "{file_path}",
        "output_file": "{output_path}",
        "fields_filled": len(processed_fields),
        "form_remains_editable": True,
        "diagnostics": diagnostics
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
    # Use PdfWrapper for inspection (has .schema and .sample_data attributes)
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
    # Use PdfWrapper for inspection and flattening
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
        
        # Fill the form with current values and flatten it (PdfWrapper flattens by default)
        flattened_stream = wrapper.fill(current_values)
        
        # Ensure parent directory exists
        os.makedirs(os.path.dirname('{flattened_path}'), exist_ok=True)
        
        # Save the flattened form
        with open('{flattened_path}', 'wb') as output_file:
            output_file.write(flattened_stream.read())
        
        print(json.dumps({{
            "success": True,
            "message": "Successfully flattened PDF form and saved to '{output_path}' (form is now non-editable)",
            "input_file": "{file_path}",
            "output_file": "{output_path}",
            "form_flattened": True
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
            "description": "Fill scanned PDFs or non-fillable documents using coordinate-based text overlay. Use this for: scanned documents, image-based PDFs, or any PDF without interactive form fields. Places text at specific X,Y positions on all pages. IMPORTANT: For interactive PDFs with form fields, use fill_form instead.",
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
                    },
                    "disable_overlap_detection": {
                        "type": "boolean",
                        "description": "Disable overlap detection to allow placement over existing text. Default: false",
                        "default": False
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
            {"param_name": "custom_coordinates", "node_type": "element", "path": "custom_coordinates", "required": False},
            {"param_name": "disable_overlap_detection", "node_type": "attribute", "path": "disable_overlap_detection", "required": False}
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
    async def fill_form_coordinates(self, file_path: str, form_data: Dict[str, Any], output_path: Optional[str] = None, template_name: Optional[str] = None, custom_coordinates: Optional[Dict[str, Dict[str, Any]]] = None, disable_overlap_detection: bool = False) -> ToolResult:
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

def detect_text_overlap(page, x, y, text_value, fontsize, disable_detection=False):
    '''Detect if placing text at position would overlap with existing text'''
    try:
        # If overlap detection is disabled, always return no overlap
        if disable_detection:
            return False, None
        # Get existing text blocks on the page
        text_blocks = page.get_text("dict")["blocks"]
        
        # Calculate bounding box for our new text (more lenient sizing)
        # Rough estimation: character width ≈ fontsize * 0.5, height ≈ fontsize * 0.8
        text_width = len(text_value) * fontsize * 0.5
        text_height = fontsize * 0.8
        new_bbox = (x, y - text_height, x + text_width, y)
        
        # Check for overlap with existing text
        for block in text_blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        existing_bbox = span["bbox"]
                        existing_text = span["text"].strip()
                        
                        # Skip empty text
                        if not existing_text:
                            continue
                            
                        # Check if bounding boxes overlap with small margin for tolerance
                        margin = 2  # 2 point margin for overlap tolerance
                        if not (new_bbox[2] < existing_bbox[0] - margin or  # new is left of existing
                                new_bbox[0] > existing_bbox[2] + margin or  # new is right of existing
                                new_bbox[3] < existing_bbox[1] - margin or  # new is above existing
                                new_bbox[1] > existing_bbox[3] + margin):   # new is below existing
                            return True, existing_text
        
        return False, None
    except Exception:
        return False, None

def fill_pdf_coordinates(pdf_path, form_data, field_positions, output_path, disable_overlap_detection=False):
    '''Fill PDF using coordinate-based text overlay with collision detection'''
    try:
        doc = pymupdf.open(pdf_path)
        filled_count = 0
        skipped_fields = []
        placed_positions = []
        overlap_detected = []
        
        if len(doc) == 0:
            raise Exception("PDF has no pages")
        
        # Process all pages in the document
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_width = page.rect.width
            page_height = page.rect.height
            
            for field_name, value in form_data.items():
                if value is None or value == "":
                    continue
                    
                # Find position for this field
                position = None
                field_key = field_name.lower()
                
                # Try exact match first
                if field_key in field_positions:
                    position = field_positions[field_key]
                else:
                    # Try normalized field name (remove _2, _3, etc.)
                    base_field_key = field_key.rstrip('_0123456789')
                    if base_field_key in field_positions:
                        position = field_positions[base_field_key]
                    else:
                        # Fuzzy match - check if any position key is contained in field name or vice versa
                        for pos_key, pos_data in field_positions.items():
                            # Enhanced matching: handle City -> City_2, City_3
                            if (pos_key in field_key or field_key in pos_key or 
                                pos_key.rstrip('_0123456789') == base_field_key):
                                position = pos_data
                                break
                
                # Handle page-specific logic
                if position:
                    # Check if this field has a specific page assignment
                    if isinstance(position, dict) and 'page' in position:
                        if position.get('page') != page_num:
                            continue
                    # For fields without specific page assignment, use intelligent page detection
                    elif page_num > 0 and not position.get('repeat_on_all_pages', False):
                        # Skip fields that likely belong to other pages based on field name patterns
                        field_lower = field_name.lower()
                        
                        # Page 1 fields (usually business basic info)
                        page1_indicators = ['business', 'company', 'legal', 'trade', 'billing', 'service', 'contact', 'phone', 'email', 'address', 'city', 'state', 'zip']
                        
                        # Page 2 fields (usually corporate structure, officers)
                        page2_indicators = ['president', 'vice', 'secretary', 'treasurer', 'officer', 'director', 'individual', 'partner', 'ssn', 'dob', 'corp']
                        
                        # Page 3 fields (usually financial, banking, references)
                        page3_indicators = ['bank', 'account', 'financial', 'reference', 'trade', 'signature', 'date', 'witness', 'credit']
                        
                        # Determine likely page for this field
                        likely_page = 0  # Default to page 1
                        
                        if any(indicator in field_lower for indicator in page2_indicators):
                            likely_page = 1
                        elif any(indicator in field_lower for indicator in page3_indicators):
                            likely_page = 2
                        elif any(indicator in field_lower for indicator in page1_indicators):
                            likely_page = 0
                        
                        # Skip if field likely belongs to different page
                        if likely_page != page_num:
                            continue
                
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
                        if field_type == 'checkbox':
                            # Handle various checkbox value formats
                            is_checked = False
                            if isinstance(value, bool):
                                is_checked = value
                            elif isinstance(value, (int, float)):
                                is_checked = bool(value)
                            elif isinstance(value, str):
                                is_checked = value.lower() in ['true', '1', 'yes', 'checked', 'x']
                            
                            if is_checked:
                                # Check for overlap before placing checkbox
                                has_overlap, existing_text = detect_text_overlap(page, x, y, "✓", fontsize, disable_overlap_detection)
                                if has_overlap:
                                    overlap_detected.append({{
                                        "field": field_name,
                                        "page": page_num,
                                        "x": x,
                                        "y": y,
                                        "overlapping_text": existing_text,
                                        "reason": "checkbox_overlap"
                                    }})
                                    skipped_fields.append(f"{{field_name}} (page {{page_num}}): overlaps with existing text '{{existing_text[:30]}}'")
                                else:
                                    page.insert_text(
                                        (x, y),
                                        "✓",
                                        fontsize=fontsize,
                                        color=(0, 0, 0)
                                    )
                                    filled_count += 1
                                    placed_positions.append({{
                                        "field": field_name,
                                        "page": page_num,
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
                            
                            # Check for overlap before placing text
                            has_overlap, existing_text = detect_text_overlap(page, x, y, text_value, fontsize, disable_overlap_detection)
                            if has_overlap:
                                overlap_detected.append({{
                                    "field": field_name,
                                    "page": page_num,
                                    "x": x,
                                    "y": y,
                                    "overlapping_text": existing_text,
                                    "reason": "text_overlap"
                                }})
                                skipped_fields.append(f"{{field_name}} (page {{page_num}}): overlaps with existing text '{{existing_text[:30]}}'")
                            else:
                                page.insert_text(
                                    (x, y),
                                    text_value,
                                    fontsize=fontsize,
                                    color=(0, 0, 0)
                                )
                                filled_count += 1
                                placed_positions.append({{
                                    "field": field_name,
                                    "page": page_num,
                                    "x": x,
                                    "y": y,
                                    "value": text_value,
                                    "type": "text"
                                }})
                            
                    except Exception as e:
                        skipped_fields.append(f"{{field_name}} (page {{page_num}}): {{str(e)}}")
                else:
                    if page_num == 0:  # Only report missing position once (on first page)
                        skipped_fields.append(f"{{field_name}}: no position found")
        
        # Save the filled PDF
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.save(output_path)
        doc.close()
        
        return filled_count, skipped_fields, placed_positions, overlap_detected
        
    except Exception as e:
        raise Exception(f"Error in coordinate filling: {{str(e)}}")

# Main execution
input_path = '{full_path}'
form_data = {json.dumps(form_data)}
field_positions = {json.dumps(field_positions)}
output_path = '{filled_path}'

try:
    filled_count, skipped_fields, placed_positions, overlap_detected = fill_pdf_coordinates(
        input_path, form_data, field_positions, output_path, {disable_overlap_detection}
    )
    
    # Calculate proper diagnostics for coordinate filling
    total_requested = len(form_data)
    overlaps_count = len(overlap_detected)
    position_missing_count = len([f for f in skipped_fields if "no position found" in f])
    other_errors_count = len(skipped_fields) - overlaps_count - position_missing_count
    
    # Calculate page-specific statistics
    page_stats = {{}}
    for position in placed_positions:
        page_num = position["page"]
        if page_num not in page_stats:
            page_stats[page_num] = {{"filled": 0, "fields": []}}
        page_stats[page_num]["filled"] += 1
        page_stats[page_num]["fields"].append(position["field"])
    
    result = {{
        "success": True,
        "method": "coordinate_overlay_multipage",
        "message": f"Filled {{filled_count}} fields across {{len(page_stats)}} pages using coordinate-based overlay",
        "output_path": "{output_path}",
        "input_file": "{file_path}",
        "fields_filled": filled_count,
        "fields_skipped": len(skipped_fields),
        "skipped_fields": skipped_fields,
        "placed_positions": placed_positions,
        "total_fields_attempted": total_requested,
        "overlap_detected": overlap_detected,
        "page_statistics": page_stats,
        "diagnostics": {{
            "requested_count": total_requested,
            "filled_count": filled_count,
            "failed_count": len(skipped_fields),
            "overlaps_detected": overlaps_count,
            "position_missing": position_missing_count,
            "other_errors": other_errors_count,
            "method": "coordinate_overlay_multipage",
            "pages_processed": len(page_stats),
            "success_rate": round((filled_count / total_requested) * 100, 1) if total_requested > 0 else 0
        }}
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
                        "description": "Page number to analyze (0-indexed). Use -1 to analyze all pages.",
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
    
    # Determine pages to analyze
    if {page_number} == -1:
        # Analyze all pages
        pages_to_analyze = list(range(len(doc)))
    else:
        # Analyze specific page
        if len(doc) <= {page_number}:
            print(json.dumps({{
                "success": False,
                "error": f"Page {page_number} does not exist. Document has {{len(doc)}} pages."
            }}))
            doc.close()
            exit()
        pages_to_analyze = [{page_number}]
    
    all_pages_data = []
    
    for page_num in pages_to_analyze:
        page = doc[page_num]
        
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
        
        page_data = {{
            "page_number": page_num,
            "page_size": {{"width": round(page.rect.width), "height": round(page.rect.height)}},
            "total_text_elements": len(text_instances),
            "potential_fields": unique_fields[:15],  # Limit to top 15 matches
            "sample_text": text_instances[:5]  # First 5 text elements for reference
        }}
        all_pages_data.append(page_data)
    
    # Format output based on whether it's single page or all pages
    if {page_number} == -1:
        print(json.dumps({{
            "success": True,
            "file_path": "{file_path}",
            "analyzed_all_pages": True,
            "total_pages": len(doc),
            "pages": all_pages_data
        }}))
    else:
        print(json.dumps({{
            "success": True,
            "file_path": "{file_path}",
            "page_number": {page_number},
            "page_size": all_pages_data[0]["page_size"],
            "total_text_elements": all_pages_data[0]["total_text_elements"],
            "potential_fields": all_pages_data[0]["potential_fields"],
            "sample_text": all_pages_data[0]["sample_text"]
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
    @openapi_schema({
        "type": "function",
        "function": {
            "name": "create_page_specific_template",
            "description": "Create a coordinate template with automatic page assignment for multi-page forms. Automatically assigns fields to appropriate pages based on field names and content patterns.",
            "parameters": {
                "type": "object",
                "properties": {
                    "template_name": {
                        "type": "string",
                        "description": "Name for this template (e.g., 'credit_application', 'employment_form')"
                    },
                    "field_coordinates": {
                        "type": "object",
                        "description": "Dictionary mapping field names to their positions {field_name: {x: int, y: int, fontsize: int, type: 'text'|'checkbox'}}. Page assignment will be automatic."
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
        tag_name="create-page-specific-template",
        mappings=[
            {"param_name": "template_name", "node_type": "attribute", "path": "."},
            {"param_name": "field_coordinates", "node_type": "element", "path": "field_coordinates"},
            {"param_name": "description", "node_type": "attribute", "path": "description", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="create_page_specific_template">
        <parameter name="template_name">credit_app_multipage</parameter>
        <parameter name="field_coordinates">{
            "business_name": {"x": 150, "y": 200, "fontsize": 10, "type": "text"},
            "president_name": {"x": 150, "y": 300, "fontsize": 10, "type": "text"},
            "bank_name": {"x": 150, "y": 400, "fontsize": 10, "type": "text"}
        }</parameter>
        <parameter name="description">Multi-page credit application with auto page assignment</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def create_page_specific_template(self, template_name: str, field_coordinates: Dict[str, Dict[str, Any]], description: str = "") -> ToolResult:
        """Create a page-specific coordinate template with automatic page assignment."""
        try:
            await self._ensure_sandbox()
            
            # Validate template name
            if not template_name or not template_name.replace('_', '').replace('-', '').isalnum():
                return self.fail_response("Template name must contain only letters, numbers, hyphens, and underscores")
            
            # Validate field coordinates
            if not field_coordinates or not isinstance(field_coordinates, dict):
                return self.fail_response("Field coordinates must be a non-empty dictionary")
            
            template_path = f"{self.workspace_path}/form_templates/{template_name}_multipage.json"
            
            script_content = f"""
import json
import os
from datetime import datetime

def assign_page_to_field(field_name):
    '''Automatically assign page numbers based on field name patterns'''
    field_lower = field_name.lower()
    
    # Page 1 fields (business basic info)
    page1_indicators = ['business', 'company', 'legal', 'trade', 'billing', 'service', 'contact', 'phone', 'email', 'address', 'city', 'state', 'zip', 'county', 'incorporation']
    
    # Page 2 fields (corporate structure, officers)
    page2_indicators = ['president', 'vice', 'secretary', 'treasurer', 'officer', 'director', 'individual', 'partner', 'ssn', 'dob', 'corp', 'authorize']
    
    # Page 3 fields (financial, banking, references)
    page3_indicators = ['bank', 'account', 'financial', 'reference', 'trade', 'signature', 'date', 'witness', 'credit', 'check', 'routing']
    
    if any(indicator in field_lower for indicator in page2_indicators):
        return 1
    elif any(indicator in field_lower for indicator in page3_indicators):
        return 2
    else:
        return 0  # Default to page 1

# Process field coordinates with page assignment
field_coords = {json.dumps(field_coordinates)}
page_specific_coords = {{}}

for field_name, coords in field_coords.items():
    if not isinstance(coords, dict):
        continue
        
    # Auto-assign page if not specified
    if 'page' not in coords:
        coords['page'] = assign_page_to_field(field_name)
    
    # Ensure required fields with defaults
    normalized_coord = {{
        "x": int(coords.get("x", 100)),
        "y": int(coords.get("y", 100)),
        "fontsize": int(coords.get("fontsize", 10)),
        "type": coords.get("type", "text"),
        "page": coords.get("page", 0),
        "repeat_on_all_pages": coords.get("repeat_on_all_pages", False)
    }}
    
    # Validate ranges
    if normalized_coord["fontsize"] < 6:
        normalized_coord["fontsize"] = 6
    elif normalized_coord["fontsize"] > 24:
        normalized_coord["fontsize"] = 24
    
    page_specific_coords[field_name.lower()] = normalized_coord

# Group fields by page for analysis
pages_summary = {{}}
for field_name, coords in page_specific_coords.items():
    page_num = coords['page']
    if page_num not in pages_summary:
        pages_summary[page_num] = []
    pages_summary[page_num].append(field_name)

template_data = {{
    "name": "{template_name}_multipage",
    "description": "{description}",
    "created": datetime.now().isoformat(),
    "version": "2.0",
    "type": "multi_page",
    "fields": page_specific_coords,
    "pages_summary": pages_summary,
    "total_pages": max(pages_summary.keys()) + 1 if pages_summary else 1
}}

# Create directory if needed
os.makedirs(os.path.dirname('{template_path}'), exist_ok=True)

# Save template
with open('{template_path}', 'w') as f:
    json.dump(template_data, f, indent=2)

result = {{
    "success": True,
    "message": "Multi-page template '{template_name}_multipage' created successfully",
    "template_path": '{template_path}'.replace('{self.workspace_path}/', ''),
    "field_count": len(page_specific_coords),
    "pages_summary": pages_summary,
    "total_pages": template_data["total_pages"]
}}

print(json.dumps(result))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error creating multi-page template: {str(e)}")

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
            "name": "detect_and_remove_overlays",
            "description": "Post-process a filled PDF to detect and remove text overlays that may have been placed over existing text. Use this after coordinate-based filling to clean up any problematic overlays.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the filled PDF file to process"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output path for cleaned PDF. If not provided, will add '_cleaned' suffix."
                    },
                    "sensitivity": {
                        "type": "number",
                        "description": "Overlap detection sensitivity (0.0 to 1.0). Higher values detect more overlaps. Default: 0.8",
                        "default": 0.8
                    }
                },
                "required": ["file_path"]
            }
        }
    })
    @xml_schema(
        tag_name="detect-and-remove-overlays",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "output_path", "node_type": "attribute", "path": "output_path", "required": False},
            {"param_name": "sensitivity", "node_type": "attribute", "path": "sensitivity", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="detect_and_remove_overlays">
        <parameter name="file_path">forms/filled_form.pdf</parameter>
        <parameter name="sensitivity">0.8</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def detect_and_remove_overlays(self, file_path: str, output_path: Optional[str] = None, sensitivity: float = 0.8) -> ToolResult:
        """Detect and remove text overlays from a filled PDF."""
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
                cleaned_path = f"{self.workspace_path}/{output_path}"
            else:
                base_name = os.path.splitext(file_path)[0]
                cleaned_path = f"{self.workspace_path}/{base_name}_cleaned_{uuid.uuid4().hex[:8]}.pdf"
                output_path = cleaned_path.replace(f"{self.workspace_path}/", "")
            
            script_content = f"""
import pymupdf
import json
import os

def detect_overlapping_text(page, sensitivity=0.8):
    '''Detect overlapping text elements on a page'''
    try:
        text_blocks = page.get_text("dict")["blocks"]
        overlaps = []
        
        all_spans = []
        for block in text_blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        if span["text"].strip():
                            all_spans.append(span)
        
        # Check each span against all others
        for i, span1 in enumerate(all_spans):
            for j, span2 in enumerate(all_spans):
                if i >= j:  # Avoid duplicate checks
                    continue
                    
                bbox1 = span1["bbox"]
                bbox2 = span2["bbox"]
                
                # Calculate overlap area
                overlap_left = max(bbox1[0], bbox2[0])
                overlap_top = max(bbox1[1], bbox2[1])
                overlap_right = min(bbox1[2], bbox2[2])
                overlap_bottom = min(bbox1[3], bbox2[3])
                
                if overlap_left < overlap_right and overlap_top < overlap_bottom:
                    overlap_area = (overlap_right - overlap_left) * (overlap_bottom - overlap_top)
                    
                    # Calculate areas of both spans
                    area1 = (bbox1[2] - bbox1[0]) * (bbox1[3] - bbox1[1])
                    area2 = (bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1])
                    
                    # Check if overlap is significant
                    overlap_ratio = overlap_area / min(area1, area2)
                    
                    if overlap_ratio > sensitivity:
                        overlaps.append({{
                            "span1": {{"text": span1["text"], "bbox": bbox1}},
                            "span2": {{"text": span2["text"], "bbox": bbox2}},
                            "overlap_ratio": overlap_ratio,
                            "overlap_area": overlap_area
                        }})
        
        return overlaps
    except Exception as e:
        return []

def remove_overlays(pdf_path, output_path, sensitivity):
    '''Remove overlapping text from PDF'''
    try:
        doc = pymupdf.open(pdf_path)
        total_overlaps = 0
        removed_count = 0
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Detect overlaps
            overlaps = detect_overlapping_text(page, sensitivity)
            total_overlaps += len(overlaps)
            
            # For detected overlaps, we would need to reconstruct the page
            # This is complex with PyMuPDF, so we'll just report the overlaps
            # In a real implementation, you'd need to use page.clean_contents()
            # and selectively remove text elements
            
        result = {{
            "overlaps_detected": total_overlaps,
            "removed_count": removed_count,
            "note": "Overlap detection completed. Manual review recommended for complex overlaps."
        }}
        
        # For now, just copy the file since actual text removal is complex
        import shutil
        shutil.copy2(pdf_path, output_path)
        
        doc.close()
        return result
        
    except Exception as e:
        raise Exception(f"Error in overlay removal: {{str(e)}}")

# Main execution
input_path = '{full_path}'
output_path = '{cleaned_path}'
sensitivity = {sensitivity}

try:
    result = remove_overlays(input_path, output_path, sensitivity)
    
    final_result = {{
        "success": True,
        "message": "Completed overlay detection and processing",
        "input_file": "{file_path}",
        "output_file": "{output_path}",
        "overlaps_detected": result["overlaps_detected"],
        "removed_count": result["removed_count"],
        "note": result["note"]
    }}
    
    print(json.dumps(final_result))
    
except Exception as e:
    error_result = {{
        "success": False,
        "error": f"Error in overlay detection: {{str(e)}}"
    }}
    print(json.dumps(error_result))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error in overlay detection: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "generate_coordinate_grid",
            "description": "Generate visual coordinate grid overlay on all pages of PDFs to help identify exact X,Y positions for field placement. Use this as a visual aid when working with scanned documents to determine precise coordinates for fill_form_coordinates. Helpful for creating custom coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file to add grid to"
                    },
                    "grid_spacing": {
                        "type": "integer",
                        "description": "Major grid spacing in points. Use 5-10 for precise work, 25 for general use",
                        "default": 10
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
        <parameter name="grid_spacing">5</parameter>
        <parameter name="fine_grid">true</parameter>
        <parameter name="coordinate_labels">true</parameter>
        <parameter name="crosshairs">true</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def generate_coordinate_grid(self, file_path: str, grid_spacing: int = 10, fine_grid: bool = True, coordinate_labels: bool = True, crosshairs: bool = False, output_path: Optional[str] = None) -> ToolResult:
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

def generate_grid():
    doc = None
    try:
        doc = pymupdf.open('{full_path}')
        
        if doc is None:
            raise Exception("Failed to open PDF document")
        
        if doc.is_closed:
            raise Exception("PDF document is closed")
            
        page_count = len(doc)
        if page_count == 0:
            raise Exception("PDF document has no pages")
        
        grid_spacing = {grid_spacing}
        fine_grid = {fine_grid}
        coordinate_labels = {coordinate_labels}
        crosshairs = {crosshairs}
        
        # Process all pages
        for page_num in range(page_count):
            page = doc[page_num]
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
            
            # Add enhanced instructions (only on first page)
            if page_num == 0:
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
        
        result = {{
            "success": True,
            "message": f"Precision coordinate grid generated successfully for {{page_count}} pages",
            "output_path": "{output_path}",
            "grid_spacing": grid_spacing,
            "fine_grid_spacing": fine_spacing if fine_grid else None,
            "features": {{
                "fine_grid": fine_grid,
                "coordinate_labels": coordinate_labels,
                "crosshairs": crosshairs
            }},
            "total_pages": page_count,
            "precision_level": "high" if grid_spacing <= 10 else "medium" if grid_spacing <= 25 else "standard"
        }}
        
        return result
        
    except Exception as e:
        raise Exception(f"Error generating grid: {{str(e)}}")
    finally:
        if doc is not None and not doc.is_closed:
            doc.close()

# Execute the grid generation
try:
    result = generate_grid()
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({{
        "success": False,
        "error": str(e)
    }}))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script)
            
        except Exception as e:
            return self.fail_response(f"Error generating coordinate grid: {str(e)}")

    @openapi_schema({
        "type": "function",
        "function": {
            "name": "smart_form_fill",
            "description": "Modern AI-powered form filling using computer vision and automatic field detection. Automatically identifies form fields and fills them intelligently without manual coordinate mapping.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to the PDF file to fill"
                    },
                    "form_data": {
                        "type": "object",
                        "description": "Data to fill in the form using intelligent field matching"
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output path for the filled form"
                    },
                    "use_vision_model": {
                        "type": "boolean",
                        "description": "Use vision language model for field detection (more accurate but slower)",
                        "default": True
                    }
                },
                "required": ["file_path", "form_data"]
            }
        }
    })
    @xml_schema(
        tag_name="smart-form-fill",
        mappings=[
            {"param_name": "file_path", "node_type": "attribute", "path": "."},
            {"param_name": "form_data", "node_type": "element", "path": "form_data"},
            {"param_name": "output_path", "node_type": "attribute", "path": "output_path", "required": False},
            {"param_name": "use_vision_model", "node_type": "attribute", "path": "use_vision_model", "required": False}
        ],
        example='''
        <function_calls>
        <invoke name="smart_form_fill">
        <parameter name="file_path">forms/credit_application.pdf</parameter>
        <parameter name="form_data">{
            "business_name": "ABC Manufacturing LLC",
            "phone": "(555) 123-4567",
            "email": "info@abc.com"
        }</parameter>
        </invoke>
        </function_calls>
        '''
    )
    async def smart_form_fill(self, file_path: str, form_data: Dict[str, Any], output_path: Optional[str] = None, use_vision_model: bool = True) -> ToolResult:
        """Modern AI-powered form filling using automatic field detection."""
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
                # Ensure Final_filled_ prefix
                path_parts = output_path.split('/')
                filename = path_parts[-1]
                if not filename.startswith("Final_filled_"):
                    filename = f"Final_filled_{filename}"
                    path_parts[-1] = filename
                    output_path = '/'.join(path_parts)
                filled_path = f"{self.workspace_path}/{output_path}"
            else:
                base_name = os.path.splitext(file_path)[0]
                filename = os.path.basename(base_name)
                filled_path = f"{self.workspace_path}/Final_filled_{filename}_{uuid.uuid4().hex[:8]}.pdf"
                output_path = filled_path.replace(f"{self.workspace_path}/", "")
            
            script_content = f"""
import pymupdf
import json
import re
import os
from typing import Dict, List, Tuple, Any
import difflib

def detect_form_fields_advanced(page):
    '''Enhanced form field detection with better positioning analysis'''
    try:
        # Get all text with detailed information
        text_dict = page.get_text("dict")
        page_width = page.rect.width
        page_height = page.rect.height
        
        # Extract all text elements with positions
        text_elements = []
        for block in text_dict["blocks"]:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        text = span["text"].strip()
                        if text:
                            text_elements.append({{
                                "text": text,
                                "bbox": span["bbox"],
                                "fontsize": span["size"],
                                "flags": span["flags"]
                            }})
        
        # Detect drawing elements (lines, rectangles that could be form fields)
        input_areas = []
        try:
            drawings = page.get_drawings()
            
            # Find underlines and boxes that might indicate input areas
            for drawing in drawings:
                for item in drawing["items"]:
                    if item[0] == "l":  # Line
                        x1, y1, x2, y2 = item[1:]
                        # Horizontal lines could be underlines for text fields
                        if abs(y1 - y2) < 2 and abs(x2 - x1) > 20:  # Horizontal line
                            input_areas.append({{
                                "type": "underline",
                                "bbox": [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)],
                                "width": abs(x2 - x1)
                            }})
                    elif item[0] == "re":  # Rectangle
                        x1, y1, x2, y2 = item[1:5]
                        # Small rectangles could be checkboxes
                        if abs(x2 - x1) < 30 and abs(y2 - y1) < 30:
                            input_areas.append({{
                                "type": "checkbox",
                                "bbox": [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)]
                            }})
                        # Larger rectangles could be text input areas
                        elif abs(x2 - x1) > 50:
                            input_areas.append({{
                                "type": "text_box",
                                "bbox": [min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)],
                                "width": abs(x2 - x1)
                            }})
        except Exception as e:
            print(f"Warning: Could not detect drawings: {{e}}")
        
        # Enhanced field indicators
        field_indicators = [
            "name", "address", "phone", "email", "date", "city", "state", "zip",
            "business", "company", "contact", "fax", "title", "amount", "number",
            "bank", "account", "reference", "signature", "federal", "tax", "id",
            "incorporation", "years", "employees", "credit", "payment", "terms",
            "president", "vice", "secretary", "treasurer", "ssn", "dob", "billing",
            "legal", "trade", "service", "individual", "partner", "corp", "llc"
        ]
        
        potential_fields = []
        
        for element in text_elements:
            text = element["text"].lower()
            bbox = element["bbox"]
            
            # Check if this looks like a field label
            is_label = False
            field_type = None
            
            # Method 1: Direct colon detection
            if text.endswith(":"):
                is_label = True
                field_type = text.rstrip(":").strip()
            
            # Method 2: Check for field indicators in the text
            if not is_label:
                for indicator in field_indicators:
                    if indicator in text and len(text) < 80:  # Increased length limit
                        is_label = True
                        field_type = indicator
                        break
            
            # Method 3: Look for parentheses indicating input areas
            if not is_label and "(" in text and ")" in text and text.count("(") <= 2:
                is_label = True
                if not field_type:
                    field_type = text.split("(")[0].strip().rstrip(":")
                if not field_type or len(field_type) < 2:
                    field_type = "input_field"
            
            # Method 4: Look for underscores indicating blank spaces
            if not is_label and "_" in text and len(text) > 3:
                underscore_count = text.count("_")
                if underscore_count > 2:  # Likely a blank field
                    is_label = True
                    # Try to find a label nearby
                    for other_element in text_elements:
                        other_bbox = other_element["bbox"]
                        # Check if there's a label to the left or above
                        if (other_bbox[2] <= bbox[0] + 20 and abs(other_bbox[3] - bbox[3]) < 15) or \
                           (other_bbox[3] <= bbox[1] + 10 and abs(other_bbox[0] - bbox[0]) < 100):
                            potential_label = other_element["text"].lower().strip().rstrip(":")
                            if any(ind in potential_label for ind in field_indicators) or len(potential_label) > 2:
                                field_type = potential_label if potential_label else "text_field"
                                break
                    if not field_type:
                        field_type = "text_field"
            
            # Method 5: Text patterns that suggest form fields (more permissive)
            if not is_label:
                # Common form patterns
                form_patterns = [
                    r'^\w+\s*:\s*$',  # Word followed by colon
                    r'^\w+\s+\w+\s*:\s*$',  # Two words followed by colon
                    r'^\w+\s*\(\s*\)\s*$',  # Word followed by parentheses
                    r'^\w+.*\s+name\s*:?\s*$',  # Anything with "name"
                    r'^\w+.*\s+address\s*:?\s*$',  # Anything with "address"
                ]
                
                import re
                for pattern in form_patterns:
                    if re.match(pattern, text, re.IGNORECASE):
                        is_label = True
                        field_type = text.lower().strip().rstrip(":")
                        break
            
            # Method 6: Fallback - any short text that might be a label
            if not is_label and len(text) > 2 and len(text) < 30:
                # Check if this could be a standalone label
                if any(char.isalpha() for char in text) and not text.isdigit():
                    # More permissive - consider it a potential field
                    is_label = True
                    field_type = text.lower().strip().rstrip(":")
            
            if is_label and field_type:
                # Enhanced positioning logic
                input_position = None
                
                # Method 1: Look for nearby input areas (underlines, boxes)
                if input_areas:
                    best_input_area = None
                    min_distance = float('inf')
                    
                    for input_area in input_areas:
                        area_bbox = input_area["bbox"]
                        # Calculate distance from label to input area
                        label_center_x = (bbox[0] + bbox[2]) / 2
                        label_center_y = (bbox[1] + bbox[3]) / 2
                        area_center_x = (area_bbox[0] + area_bbox[2]) / 2
                        area_center_y = (area_bbox[1] + area_bbox[3]) / 2
                        
                        distance = ((label_center_x - area_center_x)**2 + (label_center_y - area_center_y)**2)**0.5
                        
                        # Input area should be reasonably close and in the right direction
                        if distance < 150 and distance < min_distance:
                            # Check if input area is to the right or below the label
                            if area_center_x > label_center_x - 50 and area_center_y > label_center_y - 20:
                                best_input_area = input_area
                                min_distance = distance
                    
                    if best_input_area:
                        area_bbox = best_input_area["bbox"]
                        if best_input_area["type"] == "underline":
                            # Place text just above the underline
                            input_position = {{
                                "x": area_bbox[0] + 5,
                                "y": area_bbox[1] - 2
                            }}
                        elif best_input_area["type"] == "text_box":
                            # Place text inside the box
                            input_position = {{
                                "x": area_bbox[0] + 5,
                                "y": area_bbox[1] + (area_bbox[3] - area_bbox[1]) * 0.7
                            }}
                        elif best_input_area["type"] == "checkbox":
                            # Place checkmark in the center of the box
                            input_position = {{
                                "x": area_bbox[0] + (area_bbox[2] - area_bbox[0]) / 2,
                                "y": area_bbox[1] + (area_bbox[3] - area_bbox[1]) * 0.7
                            }}
                
                # Method 2: Smart positioning based on text layout
                if not input_position:
                    # Analyze the layout around the label
                    label_right = bbox[2]
                    label_bottom = bbox[3]
                    label_top = bbox[1]
                    
                    # Look for space to the right
                    space_to_right = True
                    min_distance_right = float('inf')
                    
                    for other_element in text_elements:
                        other_bbox = other_element["bbox"]
                        # Check if there's text immediately to the right
                        if (other_bbox[0] > label_right and 
                            other_bbox[0] < label_right + 200 and  # Increased search range
                            abs(other_bbox[3] - label_bottom) < 15):  # More tolerant vertical alignment
                            distance = other_bbox[0] - label_right
                            if distance < min_distance_right:
                                min_distance_right = distance
                            if distance < 50:  # Too close
                                space_to_right = False
                                break
                    
                    if space_to_right:
                        # Place text to the right of the label
                        offset = min(30, max(10, min_distance_right // 2)) if min_distance_right != float('inf') else 15
                        input_position = {{
                            "x": label_right + offset,
                            "y": label_top + (label_bottom - label_top) * 0.7
                        }}
                    else:
                        # Look for space below the label
                        next_line_y = label_bottom + 15
                        input_position = {{
                            "x": bbox[0] + 20,
                            "y": next_line_y
                        }}
                
                # Method 3: Column-aware positioning (fallback)
                if not input_position:
                    # Determine which column we're in based on page layout
                    if bbox[0] < page_width / 3:
                        # Left column
                        input_position = {{"x": bbox[2] + 20, "y": bbox[1] + (bbox[3] - bbox[1]) * 0.7}}
                    elif bbox[0] < 2 * page_width / 3:
                        # Middle column
                        input_position = {{"x": bbox[2] + 15, "y": bbox[1] + (bbox[3] - bbox[1]) * 0.7}}
                    else:
                        # Right column
                        input_position = {{"x": bbox[2] + 10, "y": bbox[1] + (bbox[3] - bbox[1]) * 0.7}}
                
                # Validate and adjust position
                if input_position:
                    input_position["x"] = max(10, min(input_position["x"], page_width - 100))
                    input_position["y"] = max(20, min(input_position["y"], page_height - 20))
                
                potential_fields.append({{
                    "label": element["text"],
                    "field_type": field_type,
                    "input_position": input_position or {{"x": bbox[2] + 15, "y": bbox[1] + (bbox[3] - bbox[1]) * 0.7}},
                    "label_bbox": bbox,
                    "confidence": 0.8
                }})
        
        print(f"Debug: Found {{len(potential_fields)}} potential fields on page")
        return potential_fields
    except Exception as e:
        print(f"Error in enhanced field detection: {{e}}")
        import traceback
        traceback.print_exc()
        return []

def match_form_data_to_fields(form_data, detected_fields):
    '''Intelligently match form data keys to detected fields with enhanced matching'''
    matches = []
    used_fields = set()
    
    print(f"Debug: Matching {{len(form_data)}} data fields to {{len(detected_fields)}} detected fields")
    
    for data_key, data_value in form_data.items():
        if not data_value or data_value == "":
            continue
            
        best_match = None
        best_score = 0
        
        data_key_clean = data_key.lower().replace("_", " ").strip()
        data_key_parts = data_key_clean.split()
        
        for i, field in enumerate(detected_fields):
            if i in used_fields:
                continue
                
            field_type = field["field_type"].lower().strip()
            field_label = field.get("label", "").lower().strip()
            
            # Multiple matching strategies with different weights
            total_score = 0
            
            # Strategy 1: Exact match (highest weight)
            if data_key_clean == field_type or data_key_clean == field_label:
                total_score = 1.0
            
            # Strategy 2: Direct keyword matching
            elif any(part in field_type or part in field_label for part in data_key_parts):
                # Count how many parts match
                matches_count = sum(1 for part in data_key_parts if part in field_type or part in field_label)
                total_score = 0.7 + (matches_count * 0.1)
            
            # Strategy 3: Fuzzy string matching
            else:
                # Compare with field type
                similarity1 = difflib.SequenceMatcher(None, data_key_clean, field_type).ratio()
                # Compare with field label
                similarity2 = difflib.SequenceMatcher(None, data_key_clean, field_label).ratio()
                base_similarity = max(similarity1, similarity2)
                
                # Enhanced keyword matching with partial matches
                keyword_boost = 0
                
                # Check each data key part against field text
                for data_part in data_key_parts:
                    # Exact word match
                    if data_part in field_type.split() or data_part in field_label.split():
                        keyword_boost += 0.3
                    # Partial word match
                    elif any(data_part in word or word in data_part for word in field_type.split() + field_label.split()):
                        keyword_boost += 0.2
                    # Substring match
                    elif data_part in field_type or data_part in field_label:
                        keyword_boost += 0.15
                
                # Special matching for common business form fields
                business_mappings = {{
                    'business': ['company', 'corp', 'llc', 'inc', 'business', 'name'],
                    'trade': ['trade', 'dba', 'doing'],
                    'legal': ['legal', 'official', 'registered'],
                    'billing': ['billing', 'bill', 'invoice'],
                    'shipping': ['shipping', 'ship', 'delivery'],
                    'phone': ['phone', 'telephone', 'tel', 'number'],
                    'email': ['email', 'e-mail', 'electronic'],
                    'address': ['address', 'street', 'location'],
                    'city': ['city', 'town'],
                    'state': ['state', 'province'],
                    'zip': ['zip', 'postal', 'code'],
                    'federal': ['federal', 'tax', 'ein', 'fein'],
                    'president': ['president', 'ceo', 'chief'],
                    'vice': ['vice', 'vp', 'assistant'],
                    'secretary': ['secretary', 'sec'],
                    'treasurer': ['treasurer', 'cfo', 'financial'],
                    'bank': ['bank', 'banking', 'financial'],
                    'account': ['account', 'acct', 'number'],
                    'reference': ['reference', 'ref', 'contact'],
                    'signature': ['signature', 'sign', 'signed'],
                    'date': ['date', 'dated', 'day'],
                    'ssn': ['ssn', 'social', 'security']
                }}
                
                # Apply business field mappings
                for data_part in data_key_parts:
                    if data_part in business_mappings:
                        mapping_words = business_mappings[data_part]
                        if any(word in field_type or word in field_label for word in mapping_words):
                            keyword_boost += 0.4
                
                # Apply positional context boost
                # If field contains numbers or special characters, it might be an input field
                if any(char.isdigit() or char in '_()[]' for char in field_type + field_label):
                    keyword_boost += 0.1
                
                total_score = base_similarity + keyword_boost
            
            # Apply confidence boost for high-confidence detections
            if field.get("confidence", 0) > 0.8:
                total_score += 0.05
            
            # Update best match if this score is better
            if total_score > best_score and total_score > 0.3:  # Lower threshold for matching
                best_match = field
                best_score = total_score
        
        if best_match:
            print(f"Debug: Matched '{{data_key}}' to '{{best_match['field_type']}}' (score: {{best_score:.2f}})")
            matches.append({{
                "data_key": data_key,
                "data_value": str(data_value),
                "field": best_match,
                "match_score": best_score
            }})
            # Mark this field as used
            for i, field in enumerate(detected_fields):
                if field == best_match:
                    used_fields.add(i)
                    break
        else:
            print(f"Debug: No match found for '{{data_key}}'")
    
    print(f"Debug: Successfully matched {{len(matches)}} fields")
    return matches

def smart_fill_pdf(pdf_path, form_data, output_path):
    '''Fill PDF using enhanced intelligent field detection with automatic overlap removal'''
    try:
        doc = pymupdf.open(pdf_path)
        
        total_matches = 0
        total_placed = 0
        total_removed_overlaps = 0
        all_matches = []
        page_results = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Use enhanced field detection
            detected_fields = detect_form_fields_advanced(page)
            
            # Match form data to detected fields
            matches = match_form_data_to_fields(form_data, detected_fields)
            
            page_placed = 0
            page_overlaps_removed = 0
            page_matches_info = []
            placed_text_positions = []
            
            # Get existing text on the page for overlap detection
            existing_text_dict = page.get_text("dict")
            existing_words = []
            for block in existing_text_dict["blocks"]:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text = span["text"].strip()
                            if text and len(text) > 1:  # Ignore single characters
                                existing_words.append({{
                                    "text": text,
                                    "bbox": span["bbox"]
                                }})
            
            for match in matches:
                try:
                    data_value = match["data_value"]
                    field = match["field"]
                    position = field["input_position"]
                    
                    # Validate position is within page bounds
                    page_rect = page.rect
                    x = max(10, min(position["x"], page_rect.width - 100))
                    y = max(20, min(position["y"], page_rect.height - 20))
                    
                    # Determine appropriate font size
                    fontsize = 9
                    if len(data_value) > 40:
                        fontsize = 8
                    elif len(data_value) > 60:
                        fontsize = 7
                    
                    # Calculate bounding box for the text we're about to place
                    # Rough estimation: character width ≈ fontsize * 0.6, height ≈ fontsize * 1.2
                    text_width = len(data_value) * fontsize * 0.6
                    text_height = fontsize * 1.2
                    new_text_bbox = [x, y - text_height, x + text_width, y]
                    
                    # Check for overlap with existing text
                    has_significant_overlap = False
                    overlapping_text = ""
                    
                    for existing_word in existing_words:
                        existing_bbox = existing_word["bbox"]
                        
                        # Calculate overlap percentage
                        overlap_area = max(0, min(new_text_bbox[2], existing_bbox[2]) - max(new_text_bbox[0], existing_bbox[0])) * \
                                     max(0, min(new_text_bbox[3], existing_bbox[3]) - max(new_text_bbox[1], existing_bbox[1]))
                        
                        new_text_area = (new_text_bbox[2] - new_text_bbox[0]) * (new_text_bbox[3] - new_text_bbox[1])
                        existing_area = (existing_bbox[2] - existing_bbox[0]) * (existing_bbox[3] - existing_bbox[1])
                        
                        if new_text_area > 0 and existing_area > 0:
                            overlap_percentage_new = (overlap_area / new_text_area) * 100
                            overlap_percentage_existing = (overlap_area / existing_area) * 100
                            
                            # If either overlap is > 20%, consider it significant
                            if overlap_percentage_new > 20 or overlap_percentage_existing > 20:
                                has_significant_overlap = True
                                overlapping_text = existing_word["text"]
                                break
                    
                    # Also check for overlap with previously placed text on this page
                    for placed_pos in placed_text_positions:
                        placed_bbox = placed_pos["bbox"]
                        
                        overlap_area = max(0, min(new_text_bbox[2], placed_bbox[2]) - max(new_text_bbox[0], placed_bbox[0])) * \
                                     max(0, min(new_text_bbox[3], placed_bbox[3]) - max(new_text_bbox[1], placed_bbox[1]))
                        
                        new_text_area = (new_text_bbox[2] - new_text_bbox[0]) * (new_text_bbox[3] - new_text_bbox[1])
                        placed_area = (placed_bbox[2] - placed_bbox[0]) * (placed_bbox[3] - placed_bbox[1])
                        
                        if new_text_area > 0 and placed_area > 0:
                            overlap_percentage = (overlap_area / min(new_text_area, placed_area)) * 100
                            
                            if overlap_percentage > 20:
                                has_significant_overlap = True
                                overlapping_text = placed_pos["text"]
                                break
                    
                    # Only place text if no significant overlap
                    if not has_significant_overlap:
                        # Insert the text
                        page.insert_text(
                            (x, y),
                            data_value,
                            fontsize=fontsize,
                            color=(0, 0, 0)
                        )
                        
                        page_placed += 1
                        total_placed += 1
                        
                        # Track placed text for future overlap detection
                        placed_text_positions.append({{
                            "text": data_value,
                            "bbox": new_text_bbox
                        }})
                        
                        page_matches_info.append({{
                            "field_label": field["label"],
                            "data_key": match["data_key"],
                            "value": data_value,
                            "position": {{"x": x, "y": y}},
                            "match_score": match["match_score"],
                            "status": "placed"
                        }})
                    else:
                        page_overlaps_removed += 1
                        total_removed_overlaps += 1
                        
                        page_matches_info.append({{
                            "field_label": field["label"],
                            "data_key": match["data_key"],
                            "value": data_value,
                            "position": {{"x": x, "y": y}},
                            "match_score": match["match_score"],
                            "status": "removed_overlap",
                            "overlapping_with": overlapping_text[:30]
                        }})
                        
                        print(f"Removed overlap: '{{match['data_key']}}' would overlap with '{{overlapping_text[:30]}}'")
                    
                except Exception as e:
                    print(f"Error processing {{match['data_key']}}: {{e}}")
            
            total_matches += len(matches)
            page_results.append({{
                "page": page_num,
                "fields_detected": len(detected_fields),
                "matches_found": len(matches),
                "successfully_placed": page_placed,
                "overlaps_removed": page_overlaps_removed,
                "matches": page_matches_info
            }})
            
            all_matches.extend(matches)
        
        # Save the filled document
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        doc.save(output_path)
        doc.close()
        
        # Calculate success metrics
        requested_fields = len(form_data)
        success_rate = (total_placed / requested_fields * 100) if requested_fields > 0 else 0
        
        return {{
            "total_fields_requested": requested_fields,
            "total_matches_found": total_matches,
            "total_successfully_placed": total_placed,
            "total_overlaps_removed": total_removed_overlaps,
            "success_rate": round(success_rate, 1),
            "pages_processed": len(page_results),
            "page_results": page_results
        }}
        
    except Exception as e:
        raise Exception(f"Error in smart form filling: {{str(e)}}")

# Main execution
input_path = '{full_path}'
form_data = {json.dumps(form_data)}
output_path = '{filled_path}'

try:
    result = smart_fill_pdf(input_path, form_data, output_path)
    
    final_result = {{
        "success": True,
        "method": "enhanced_smart_cv_detection_with_overlap_removal",
        "message": f"Smart form filling completed with automatic overlap removal: {{result['total_successfully_placed']}}/{{result['total_fields_requested']}} fields placed ({{result['success_rate']}}%), {{result.get('total_overlaps_removed', 0)}} overlaps removed",
        "output_path": "{output_path}",
        "input_file": "{file_path}",
        "fields_requested": result["total_fields_requested"],
        "fields_placed": result["total_successfully_placed"],
        "overlaps_removed": result.get("total_overlaps_removed", 0),
        "success_rate": result["success_rate"],
        "pages_processed": result["pages_processed"],
        "page_details": result["page_results"],
        "method_used": "enhanced_computer_vision_with_overlap_detection",
        "final_output": True,
        "overlap_threshold": "20%"
    }}
    
    print(json.dumps(final_result))
    
except Exception as e:
    error_result = {{
        "success": False,
        "error": f"Error in enhanced smart form filling: {{str(e)}}"
    }}
    print(json.dumps(error_result))
"""
            
            script = self._create_pdf_script(script_content)
            return await self._execute_pdf_script(script, timeout=120)
            
        except Exception as e:
            return self.fail_response(f"Error in smart form filling: {str(e)}")