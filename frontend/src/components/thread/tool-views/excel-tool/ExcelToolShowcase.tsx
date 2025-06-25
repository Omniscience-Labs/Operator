import React from 'react';
import { ExcelToolView } from './ExcelToolView';

export function ExcelToolShowcase() {
  // Example data for showcasing different Excel operations
  const examples = {
    createWorkbook: {
      assistantContent: JSON.stringify({
        tool_name: 'create-workbook',
        parameters: {
          file_path: 'quantum_demo.xlsx',
          sheet_names: ['Energy_Levels', 'Wavefunctions', 'Time_Evolution']
        }
      }),
      toolContent: JSON.stringify({
        success: true,
        message: "Excel workbook 'quantum_demo.xlsx' created successfully with sheets: Energy_Levels, Wavefunctions, Time_Evolution",
        file_path: "quantum_demo.xlsx",
        sheets: ["Energy_Levels", "Wavefunctions", "Time_Evolution"]
      })
    },
    writeData: {
      assistantContent: JSON.stringify({
        tool_name: 'write-data',
        parameters: {
          file_path: 'quantum_demo.xlsx',
          sheet_name: 'Time_Evolution',
          cell_range: 'A1:G1',
          data: [["Time t", "Electric Field E(t)", "⟨x⟩ Position", "⟨p⟩ Momentum", "⟨E⟩ Energy", "Δx Uncertainty", "ΔxΔp Product"]]
        }
      }),
      toolContent: JSON.stringify({
        success: true,
        message: "Data written to A1:G1 in sheet 'Time_Evolution'",
        file_path: "quantum_demo.xlsx",
        sheet: "Time_Evolution",
        range: "A1:G1"
      })
    },
    readData: {
      assistantContent: JSON.stringify({
        tool_name: 'read-data',
        parameters: {
          file_path: 'quantum_demo.xlsx',
          sheet_name: 'Time_Evolution',
          cell_range: 'A1:G6'
        }
      }),
      toolContent: JSON.stringify({
        success: true,
        data: [
          ["Time t", "Electric Field E(t)", "⟨x⟩ Position", "⟨p⟩ Momentum", "⟨E⟩ Energy", "Δx Uncertainty", "ΔxΔp Product"],
          [0, 0, 0, 0, 0.5, 0.707, 0.5],
          [0.5, 0.105, 0.021, 0.042, 0.501, 0.708, 0.501],
          [1, 0.368, 0.074, 0.147, 0.505, 0.711, 0.505],
          [1.5, 0.607, 0.121, 0.242, 0.515, 0.717, 0.515],
          [2, 0.736, 0.147, 0.294, 0.532, 0.73, 0.532]
        ],
        range: "A1:G6",
        sheet: "Time_Evolution",
        rows: 6,
        columns: 7
      })
    },
    listSheets: {
      assistantContent: JSON.stringify({
        tool_name: 'list-sheets',
        parameters: {
          file_path: 'quantum_harmonic_oscillator_analysis.xlsx'
        }
      }),
      toolContent: JSON.stringify({
        success: true,
        sheets: [
          "Overview",
          "Mathematical Framework",
          "Energy Levels",
          "Wavefunctions",
          "Numerical Results",
          "Comparisons",
          "Applications",
          "Quantum Tunneling",
          "QFT Connections",
          "Experiments",
          "Computational Methods"
        ],
        count: 11,
        file_path: "quantum_harmonic_oscillator_analysis.xlsx"
      })
    }
  };

  return (
    <div className="space-y-8 p-8 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">
        Excel Tool Views Showcase
      </h1>

      <div className="space-y-6">
        {/* Create Workbook Example */}
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Create Workbook
          </h2>
          <ExcelToolView
            name="create-workbook"
            assistantContent={examples.createWorkbook.assistantContent}
            toolContent={examples.createWorkbook.toolContent}
            isSuccess={true}
            isStreaming={false}
          />
        </div>

        {/* Write Data Example */}
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Write Data
          </h2>
          <ExcelToolView
            name="write-data"
            assistantContent={examples.writeData.assistantContent}
            toolContent={examples.writeData.toolContent}
            isSuccess={true}
            isStreaming={false}
          />
        </div>

        {/* Read Data Example */}
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Read Data
          </h2>
          <ExcelToolView
            name="read-data"
            assistantContent={examples.readData.assistantContent}
            toolContent={examples.readData.toolContent}
            isSuccess={true}
            isStreaming={false}
          />
        </div>

        {/* List Sheets Example */}
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            List Sheets
          </h2>
          <ExcelToolView
            name="list-sheets"
            assistantContent={examples.listSheets.assistantContent}
            toolContent={examples.listSheets.toolContent}
            isSuccess={true}
            isStreaming={false}
          />
        </div>

        {/* Streaming Example */}
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Streaming State
          </h2>
          <ExcelToolView
            name="write-data"
            assistantContent={examples.writeData.assistantContent}
            toolContent=""
            isSuccess={true}
            isStreaming={true}
          />
        </div>

        {/* Error Example */}
        <div>
          <h2 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Error State
          </h2>
          <ExcelToolView
            name="read-data"
            assistantContent={JSON.stringify({
              tool_name: 'read-data',
              parameters: {
                file_path: 'non_existent.xlsx',
                sheet_name: 'Sheet1',
                cell_range: 'A1:B2'
              }
            })}
            toolContent={JSON.stringify({
              success: false,
              error: "File 'non_existent.xlsx' does not exist"
            })}
            isSuccess={false}
            isStreaming={false}
          />
        </div>
      </div>
    </div>
  );
} 