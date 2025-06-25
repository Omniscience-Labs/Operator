# Excel Tool Guide

The `SandboxExcelTool` is a comprehensive Excel manipulation tool that provides full Excel functionality within the Operator sandbox environment using the openpyxl library. This tool enables you to create, modify, and manage Excel workbooks without requiring Microsoft Excel to be installed.

## Features

- 📊 Create and modify Excel workbooks (.xlsx files)
- 📝 Read and write data to cells and ranges
- 🎨 Apply formatting and styles (fonts, colors, borders, alignment)
- 📈 Create charts and visualizations (bar, line, pie charts)
- 📊 Manage worksheets (create, delete, rename, list)
- 🔄 Handle cell ranges and bulk data operations
- 💾 Save and load workbooks from the sandbox file system

## Available Tools

### Workbook Management

#### `create_workbook`
Creates a new Excel workbook at the specified path.

**Parameters:**
- `file_path` (string): Path where the Excel file will be created, relative to /workspace
- `sheet_names` (array, optional): List of sheet names to create (default: ["Sheet1"])

**Example:**
```xml
<function_calls>
<invoke name="create_workbook">
<parameter name="file_path">reports/sales_report.xlsx</parameter>
<parameter name="sheet_names">["Sales", "Summary", "Charts"]</parameter>
</invoke>
</function_calls>
```

#### `open_workbook`
Opens an existing Excel workbook for editing.

**Parameters:**
- `file_path` (string): Path to the Excel file to open, relative to /workspace

**Example:**
```xml
<function_calls>
<invoke name="open_workbook">
<parameter name="file_path">data/existing_report.xlsx</parameter>
</invoke>
</function_calls>
```

#### `save_workbook`
Saves an open workbook to the file system.

**Parameters:**
- `file_path` (string): Path to the Excel file to save

**Example:**
```xml
<function_calls>
<invoke name="save_workbook">
<parameter name="file_path">reports/sales_report.xlsx</parameter>
</invoke>
</function_calls>
```

#### `close_workbook`
Closes a workbook and removes it from memory.

**Parameters:**
- `file_path` (string): Path to the Excel file to close

**Example:**
```xml
<function_calls>
<invoke name="close_workbook">
<parameter name="file_path">reports/sales_report.xlsx</parameter>
</invoke>
</function_calls>
```

### Worksheet Management

#### `list_worksheets`
Lists all worksheets in an Excel workbook.

**Parameters:**
- `file_path` (string): Path to the Excel file

**Example:**
```xml
<function_calls>
<invoke name="list_worksheets">
<parameter name="file_path">reports/sales_report.xlsx</parameter>
</invoke>
</function_calls>
```

#### `create_worksheet`
Creates a new worksheet in an existing workbook.

**Parameters:**
- `file_path` (string): Path to the Excel file
- `sheet_name` (string): Name for the new worksheet
- `index` (integer, optional): Position to insert the sheet (0-based)

**Example:**
```xml
<function_calls>
<invoke name="create_worksheet">
<parameter name="file_path">reports/sales_report.xlsx</parameter>
<parameter name="sheet_name">Q4 Summary</parameter>
<parameter name="index">1</parameter>
</invoke>
</function_calls>
```

#### `delete_worksheet`
Deletes a worksheet from the workbook.

**Parameters:**
- `file_path` (string): Path to the Excel file
- `sheet_name` (string): Name of the worksheet to delete

**Example:**
```xml
<function_calls>
<invoke name="delete_worksheet">
<parameter name="file_path">reports/sales_report.xlsx</parameter>
<parameter name="sheet_name">Temp Sheet</parameter>
</invoke>
</function_calls>
```

### Data Operations

#### `write_cell_data`
Writes data to specific cells in a worksheet. Supports single values, ranges, or bulk data.

**Parameters:**
- `file_path` (string): Path to the Excel file
- `sheet_name` (string): Name of the worksheet
- `cell_range` (string): Cell range to write to (e.g., 'A1', 'A1:C3', 'B2:D10')
- `data` (array): 2D array of data to write

**Examples:**

Single cell:
```xml
<function_calls>
<invoke name="write_cell_data">
<parameter name="file_path">data/report.xlsx</parameter>
<parameter name="sheet_name">Sales</parameter>
<parameter name="cell_range">A1</parameter>
<parameter name="data">[["Total Sales"]]</parameter>
</invoke>
</function_calls>
```

Multiple cells with headers:
```xml
<function_calls>
<invoke name="write_cell_data">
<parameter name="file_path">data/report.xlsx</parameter>
<parameter name="sheet_name">Sales</parameter>
<parameter name="cell_range">A1:C3</parameter>
<parameter name="data">[["Name", "Sales", "Commission"], ["John", 1000, 100], ["Jane", 1500, 150]]</parameter>
</invoke>
</function_calls>
```

#### `read_cell_data`
Reads data from specific cells or ranges in a worksheet.

**Parameters:**
- `file_path` (string): Path to the Excel file
- `sheet_name` (string): Name of the worksheet
- `cell_range` (string): Cell range to read (e.g., 'A1', 'A1:C10', 'B:B' for entire column)

**Example:**
```xml
<function_calls>
<invoke name="read_cell_data">
<parameter name="file_path">data/report.xlsx</parameter>
<parameter name="sheet_name">Sales</parameter>
<parameter name="cell_range">A1:C10</parameter>
</invoke>
</function_calls>
```

### Formatting

#### `format_cells`
Applies formatting to cells including font, alignment, borders, and fill colors.

**Parameters:**
- `file_path` (string): Path to the Excel file
- `sheet_name` (string): Name of the worksheet
- `cell_range` (string): Cell range to format
- `font_name` (string, optional): Font name (e.g., 'Arial', 'Times New Roman')
- `font_size` (integer, optional): Font size
- `bold` (boolean, optional): Make text bold
- `italic` (boolean, optional): Make text italic
- `font_color` (string, optional): Font color in hex format (e.g., 'FF0000' for red)
- `background_color` (string, optional): Background color in hex format
- `horizontal_alignment` (string, optional): 'left', 'center', or 'right'
- `vertical_alignment` (string, optional): 'top', 'center', or 'bottom'
- `border_style` (string, optional): 'thin', 'thick', or 'medium'

**Example:**
```xml
<function_calls>
<invoke name="format_cells">
<parameter name="file_path">data/report.xlsx</parameter>
<parameter name="sheet_name">Sales</parameter>
<parameter name="cell_range">A1:C1</parameter>
<parameter name="bold">true</parameter>
<parameter name="background_color">CCCCCC</parameter>
<parameter name="horizontal_alignment">center</parameter>
<parameter name="border_style">thin</parameter>
<parameter name="font_color">000080</parameter>
</invoke>
</function_calls>
```

### Charts and Visualizations

#### `create_chart`
Creates a chart in the worksheet from data range. Supports bar, line, and pie charts.

**Parameters:**
- `file_path` (string): Path to the Excel file
- `sheet_name` (string): Name of the worksheet containing the data
- `chart_type` (string): Type of chart ('bar', 'line', or 'pie')
- `data_range` (string): Range containing the data for the chart
- `chart_title` (string, optional): Title for the chart (default: "Chart")
- `position` (string, optional): Cell position where chart will be placed (default: "E1")

**Example:**
```xml
<function_calls>
<invoke name="create_chart">
<parameter name="file_path">data/report.xlsx</parameter>
<parameter name="sheet_name">Sales</parameter>
<parameter name="chart_type">bar</parameter>
<parameter name="data_range">A1:B10</parameter>
<parameter name="chart_title">Monthly Sales Performance</parameter>
<parameter name="position">D1</parameter>
</invoke>
</function_calls>
```

## Usage Patterns

### Creating a Sales Report

```xml
<!-- 1. Create workbook with multiple sheets -->
<function_calls>
<invoke name="create_workbook">
<parameter name="file_path">reports/monthly_sales.xlsx</parameter>
<parameter name="sheet_names">["Raw Data", "Summary", "Charts"]</parameter>
</invoke>
</function_calls>

<!-- 2. Add raw sales data -->
<function_calls>
<invoke name="write_cell_data">
<parameter name="file_path">reports/monthly_sales.xlsx</parameter>
<parameter name="sheet_name">Raw Data</parameter>
<parameter name="cell_range">A1:D6</parameter>
<parameter name="data">[
  ["Date", "Salesperson", "Product", "Amount"],
  ["2024-01-01", "John", "Product A", 1000],
  ["2024-01-02", "Jane", "Product B", 1500],
  ["2024-01-03", "Bob", "Product A", 800],
  ["2024-01-04", "Alice", "Product C", 2000]
]</parameter>
</invoke>
</function_calls>

<!-- 3. Format headers -->
<function_calls>
<invoke name="format_cells">
<parameter name="file_path">reports/monthly_sales.xlsx</parameter>
<parameter name="sheet_name">Raw Data</parameter>
<parameter name="cell_range">A1:D1</parameter>
<parameter name="bold">true</parameter>
<parameter name="background_color">4472C4</parameter>
<parameter name="font_color">FFFFFF</parameter>
<parameter name="horizontal_alignment">center</parameter>
</invoke>
</function_calls>

<!-- 4. Create summary in another sheet -->
<function_calls>
<invoke name="write_cell_data">
<parameter name="file_path">reports/monthly_sales.xlsx</parameter>
<parameter name="sheet_name">Summary</parameter>
<parameter name="cell_range">A1:B4</parameter>
<parameter name="data">[
  ["Product", "Total Sales"],
  ["Product A", 1800],
  ["Product B", 1500],
  ["Product C", 2000]
]</parameter>
</invoke>
</function_calls>

<!-- 5. Create a chart -->
<function_calls>
<invoke name="create_chart">
<parameter name="file_path">reports/monthly_sales.xlsx</parameter>
<parameter name="sheet_name">Summary</parameter>
<parameter name="chart_type">pie</parameter>
<parameter name="data_range">A1:B4</parameter>
<parameter name="chart_title">Sales by Product</parameter>
<parameter name="position">D1</parameter>
</invoke>
</function_calls>

<!-- 6. Save the workbook -->
<function_calls>
<invoke name="save_workbook">
<parameter name="file_path">reports/monthly_sales.xlsx</parameter>
</invoke>
</function_calls>
```

### Data Analysis Workflow

```xml
<!-- 1. Open existing data file -->
<function_calls>
<invoke name="open_workbook">
<parameter name="file_path">data/customer_data.xlsx</parameter>
</invoke>
</function_calls>

<!-- 2. Read data for analysis -->
<function_calls>
<invoke name="read_cell_data">
<parameter name="file_path">data/customer_data.xlsx</parameter>
<parameter name="sheet_name">Customers</parameter>
<parameter name="cell_range">A1:F100</parameter>
</invoke>
</function_calls>

<!-- 3. Create analysis sheet -->
<function_calls>
<invoke name="create_worksheet">
<parameter name="file_path">data/customer_data.xlsx</parameter>
<parameter name="sheet_name">Analysis</parameter>
</invoke>
</function_calls>

<!-- 4. Add analysis results -->
<function_calls>
<invoke name="write_cell_data">
<parameter name="file_path">data/customer_data.xlsx</parameter>
<parameter name="sheet_name">Analysis</parameter>
<parameter name="cell_range">A1:B5</parameter>
<parameter name="data">[
  ["Metric", "Value"],
  ["Total Customers", 95],
  ["Average Age", 34.5],
  ["Top Region", "West Coast"],
  ["Revenue per Customer", 1250.75]
]</parameter>
</invoke>
</function_calls>

<!-- 5. Format analysis results -->
<function_calls>
<invoke name="format_cells">
<parameter name="file_path">data/customer_data.xlsx</parameter>
<parameter name="sheet_name">Analysis</parameter>
<parameter name="cell_range">A1:B1</parameter>
<parameter name="bold">true</parameter>
<parameter name="background_color">E7E6E6</parameter>
</invoke>
</function_calls>
```

## Best Practices

1. **Always create or open a workbook before performing operations**
2. **Use meaningful sheet names and file paths**
3. **Save your work regularly, especially after major changes**
4. **Close workbooks when finished to free up memory**
5. **Use cell ranges efficiently for bulk operations**
6. **Apply formatting after writing data for better performance**
7. **Create charts in dedicated sheets or areas for better organization**

## Error Handling

The Excel tool provides comprehensive error handling:

- **File not found**: Clear error messages when trying to access non-existent files
- **Sheet validation**: Checks for existing sheets before operations
- **Data validation**: Validates cell ranges and data formats
- **Memory management**: Automatic cleanup of workbook cache

## Dependencies

The tool automatically installs required dependencies in the sandbox:
- `openpyxl` - Core Excel manipulation library
- `pandas` - Data manipulation support

## Integration with Other Tools

The Excel tool works seamlessly with other Operator tools:

- **File Tool**: Use to manage Excel files in the workspace
- **Shell Tool**: Install additional Python packages if needed
- **Vision Tool**: Analyze Excel charts and data visualizations
- **Web Search**: Gather data to populate Excel reports

This comprehensive Excel tool provides all the functionality needed for professional Excel manipulation within the Operator environment, supporting everything from simple data entry to complex report generation with charts and advanced formatting. 