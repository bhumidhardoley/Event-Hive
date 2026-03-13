"use client"

import { useState } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"

type Props = {
  onDataExtracted: (data: any[]) => void
}

export default function FileUploadPreview({ onDataExtracted }: Props) {

  const [previewData,setPreviewData] = useState<any[]>([])
  const [headers,setHeaders] = useState<string[]>([])

  const handleFile = async (e: any) => {

    const file = e.target.files[0]

    if(!file) return

    const fileExt = file.name.split(".").pop()?.toLowerCase()

    // CSV
    if(fileExt === "csv"){
      Papa.parse(file,{
        header:true,
        skipEmptyLines:true,
        complete:(results:any)=>{
          setPreviewData(results.data)
          setHeaders(Object.keys(results.data[0] || {}))
          onDataExtracted(results.data)
        }
      })
    }

    // Excel
    else if(fileExt === "xlsx" || fileExt === "xls"){

      const data = await file.arrayBuffer()

      const workbook = XLSX.read(data)

      const sheet = workbook.Sheets[workbook.SheetNames[0]]

      const json = XLSX.utils.sheet_to_json(sheet)

      setPreviewData(json)

      if(json.length > 0){
        setHeaders(Object.keys(json[0]))
      }

      onDataExtracted(json)
    }

  }

  return (

    <div style={{marginTop:"20px"}}>

      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFile}
      />

      {previewData.length > 0 && (

        <div style={{marginTop:"20px"}}>

          <h4>Preview</h4>

          <div style={{overflowX:"auto"}}>

            <table border={1} cellPadding={8}>

              <thead>
                <tr>
                  {headers.map((h,i)=>(
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {previewData.slice(0,5).map((row,i)=>(
                  <tr key={i}>
                    {headers.map((h,j)=>(
                      <td key={j}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>

            </table>

          </div>

          <p>Showing first 5 rows</p>

        </div>
      )}

    </div>
  )
}