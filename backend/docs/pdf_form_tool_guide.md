# PDF Form Tool Guide

The `SandboxPDFFormTool` is a comprehensive PDF form manipulation tool that provides full PDF form functionality within the Operator sandbox environment using the PyPDFForm library. This tool enables you to read, fill, and manage PDF forms without requiring Adobe Acrobat or other PDF software.

## Features

- 📄 Read fillable form fields and their types from PDF files
- ✏️ Fill PDF forms with data (text fields, checkboxes, radio buttons, dropdowns)
- 🔍 Get current values from form fields
- 🔒 Flatten filled forms to make them non-editable
- 📋 Support for various field types (text, boolean, integer)
- 💾 Save filled forms with custom output paths

## Available Tools

### Form Field Operations

#### `read_form_fields`
Reads all fillable form fields from a PDF file and returns their schema.

**Parameters:**
- `file_path` (string): Path to the PDF file, relative to /workspace

**Returns:**
- Field names list
- Field count
- Field details with types (string, boolean, integer)
- Complete form schema

**Example:**
```xml
<function_calls>
<invoke name="read_form_fields">
<parameter name="file_path">forms/application.pdf</parameter>
</invoke>
</function_calls>
```

#### `fill_form`
Fills a PDF form with the provided field values and saves it as a new file.

**Parameters:**
- `file_path` (string): Path to the PDF form file, relative to /workspace
- `fields` (object): Dictionary of field names and values
  - Text fields: Use string values
  - Checkboxes: Use boolean values (true/false)
  - Radio buttons: Use integer values (0-based index)
  - Dropdowns: Use integer values (0-based index)
- `output_path` (string, optional): Custom output path for the filled form

**Example:**
```xml
<function_calls>
<invoke name="fill_form">
<parameter name="file_path">forms/application.pdf</parameter>
<parameter name="fields">{
    "full_name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "555-0123",
    "subscribe_newsletter": true,
    "country": 2,
    "experience_level": 1
}</parameter>
<parameter name="output_path">forms/application_completed.pdf</parameter>
</invoke>
</function_calls>
```

#### `get_form_field_value`
Retrieves the current value of a specific field in a PDF form.

**Parameters:**
- `file_path` (string): Path to the PDF file, relative to /workspace
- `field_name` (string): Name of the field to get the value from

**Example:**
```xml
<function_calls>
<invoke name="get_form_field_value">
<parameter name="file_path">forms/application_filled.pdf</parameter>
<parameter name="field_name">email</parameter>
</invoke>
</function_calls>
```

#### `flatten_form`
Flattens a filled PDF form to make it non-editable by converting form fields to static content.

**Parameters:**
- `file_path` (string): Path to the PDF file to flatten, relative to /workspace
- `output_path` (string, optional): Custom output path for the flattened PDF

**Example:**
```xml
<function_calls>
<invoke name="flatten_form">
<parameter name="file_path">forms/application_filled.pdf</parameter>
<parameter name="output_path">forms/application_final.pdf</parameter>
</invoke>
</function_calls>
```

## Usage Examples

### Example 1: Complete Form Filling Workflow

```xml
<!-- Step 1: Read available form fields -->
<function_calls>
<invoke name="read_form_fields">
<parameter name="file_path">forms/job_application.pdf</parameter>
</invoke>
</function_calls>

<!-- Step 2: Fill the form with data -->
<function_calls>
<invoke name="fill_form">
<parameter name="file_path">forms/job_application.pdf</parameter>
<parameter name="fields">{
    "applicant_name": "Jane Smith",
    "email_address": "jane.smith@email.com",
    "phone_number": "555-9876",
    "position_applying": "Software Engineer",
    "years_experience": "5",
    "available_immediately": true,
    "preferred_location": 1,
    "citizenship_status": 0
}</parameter>
<parameter name="output_path">forms/jane_smith_application.pdf</parameter>
</invoke>
</function_calls>

<!-- Step 3: Flatten the form to prevent further editing -->
<function_calls>
<invoke name="flatten_form">
<parameter name="file_path">forms/jane_smith_application.pdf</parameter>
<parameter name="output_path">forms/jane_smith_application_final.pdf</parameter>
</invoke>
</function_calls>
```

### Example 2: Tax Form Processing

```xml
<!-- Read W-9 form fields -->
<function_calls>
<invoke name="read_form_fields">
<parameter name="file_path">tax_forms/w9.pdf</parameter>
</invoke>
</function_calls>

<!-- Fill W-9 form -->
<function_calls>
<invoke name="fill_form">
<parameter name="file_path">tax_forms/w9.pdf</parameter>
<parameter name="fields">{
    "name": "ABC Corporation",
    "business_name": "ABC Corp",
    "tax_classification": 3,
    "address": "123 Main St",
    "city_state_zip": "New York, NY 10001",
    "ein": "12-3456789",
    "exempt_payee": false
}</parameter>
</invoke>
</function_calls>
```

### Example 3: Batch Form Processing

You can process multiple forms in a loop:

```python
# Example of processing multiple employee forms
employee_data = [
    {"name": "John Doe", "employee_id": "E001", "department": 2},
    {"name": "Jane Smith", "employee_id": "E002", "department": 1},
    {"name": "Bob Johnson", "employee_id": "E003", "department": 0}
]

for employee in employee_data:
    # Fill each employee's form
    fill_form(
        file_path="forms/employee_info.pdf",
        fields=employee,
        output_path=f"forms/employee_{employee['employee_id']}.pdf"
    )
```

## Field Type Reference

When filling forms, use the appropriate data type for each field:

| Field Type | Description | Example Value |
|------------|-------------|---------------|
| Text Field | Regular text input | `"John Doe"` |
| Checkbox | Boolean selection | `true` or `false` |
| Radio Button | Single choice from group | `0`, `1`, `2` (index) |
| Dropdown | Selection from list | `0`, `1`, `2` (index) |
| Multi-line Text | Text area | `"Line 1\nLine 2\nLine 3"` |

## Tips and Best Practices

1. **Always read fields first**: Use `read_form_fields` to understand the available fields and their types before filling.

2. **Field naming**: PDF field names are case-sensitive. Always use exact field names as returned by `read_form_fields`.

3. **Radio buttons and dropdowns**: These use 0-based indices. The first option is `0`, second is `1`, etc.

4. **Error handling**: Check the success status of operations and handle errors appropriately.

5. **File organization**: Keep filled forms organized with meaningful output paths that include dates or identifiers.

6. **Flattening**: Always flatten forms that should be final/non-editable to prevent tampering.

## Common Use Cases

- **HR Forms**: Employee information, tax forms, benefit enrollment
- **Applications**: Job applications, loan applications, membership forms
- **Legal Documents**: Contracts, agreements, consent forms
- **Government Forms**: Tax forms, permit applications, registration forms
- **Medical Forms**: Patient information, consent forms, insurance claims
- **Educational Forms**: Enrollment forms, transcript requests, financial aid

## Troubleshooting

### Form fields not found
- Ensure the PDF has fillable form fields (not just a scanned image)
- Use `read_form_fields` to get exact field names

### Values not filling correctly
- Check field types - boolean for checkboxes, integers for radio/dropdown
- Verify field names are exact matches (case-sensitive)

### Output file not created
- Ensure the output directory exists
- Check file permissions in the sandbox

### Large forms processing slowly
- Consider processing forms in batches
- Use meaningful file naming to avoid re-processing 