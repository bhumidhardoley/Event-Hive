"use client"

import { useState } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

type RowData = Record<string, unknown>

type Props = {
  onDataExtracted: (data: RowData[]) => void
}

export default function FileUploadPreview({ onDataExtracted }: Props) {

  const [previewData, setPreviewData] = useState<RowData[]>([])
  const [headers, setHeaders] = useState<string[]>([])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0]

    if (!file) return

    const fileExt = file.name.split(".").pop()?.toLowerCase()

    /* CSV */

    if (fileExt === "csv") {

      Papa.parse<RowData>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {

          const rows = results.data

          setPreviewData(rows)

          if (rows.length > 0) {
            setHeaders(Object.keys(rows[0]))
          }

          onDataExtracted(rows)
        }
      })
    }

    /* Excel */

    else if (fileExt === "xlsx" || fileExt === "xls") {

      const data = await file.arrayBuffer()

      const workbook = XLSX.read(data)

      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      const json = XLSX.utils.sheet_to_json<RowData>(sheet)

      setPreviewData(json)

      if (json.length > 0) {
        setHeaders(Object.keys(json[0]))
      }

      onDataExtracted(json)
    }
  }

  return (

    <div className="space-y-4">

      {/* Upload Input */}

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50 hover:border-indigo-400 transition">

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFile}
          className="text-sm text-slate-700 file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0
                     file:text-sm file:font-semibold
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100"
        />

        <p className="text-xs text-slate-500 mt-2">
          Upload CSV or Excel file containing participant information.
        </p>

      </div>

      {/* Preview Table */}

      {previewData.length > 0 && (

        <div className="space-y-3">

          <h4 className="text-sm font-semibold text-slate-800">
            Data Preview
          </h4>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">

            <table className="min-w-full text-sm text-slate-700">

              <thead className="bg-slate-100">

                <tr>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-left font-semibold text-slate-700 border-b"
                    >
                      {h}
                    </th>
                  ))}
                </tr>

              </thead>

              <tbody>

                {previewData.slice(0, 5).map((row, i) => (

                  <tr
                    key={i}
                    className="border-b last:border-none hover:bg-slate-50"
                  >

                    {headers.map((h, j) => (

                      <td key={j} className="px-4 py-2">

                        {String(row[h] ?? "")}

                      </td>

                    ))}

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          <p className="text-xs text-slate-500">
            Showing first 5 rows of the uploaded file.
          </p>

        </div>
      )}

    </div>
  )
}