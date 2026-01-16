import type { ReactNode } from 'react'
import s from './Table.module.scss'

type TableColumn = {
  key: string
  label: ReactNode
}

type TableRow = Record<string, ReactNode>

type TableProps = {
  columns: TableColumn[]
  rows: TableRow[]
}

export function Table({ columns, rows }: TableProps) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {columns.map((column) => (
              <td key={column.key}>{row[column.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
