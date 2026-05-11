import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import s from './Table.module.scss'

type TableColumn = {
  key: string
  label: ReactNode
}

type TableRow = Record<string, ReactNode>

type TableProps = {
  columns: TableColumn[]
  rows: TableRow[]
  getRowProps?: (row: TableRow, index: number) => HTMLAttributes<HTMLTableRowElement>
  scrollable?: boolean
  minWidth?: number | string
}

export function Table({
  columns,
  rows,
  getRowProps,
  scrollable = false,
  minWidth,
}: TableProps) {
  const tableStyle: CSSProperties | undefined =
    scrollable || minWidth !== undefined
      ? {
          minWidth:
            typeof minWidth === 'number'
              ? `${minWidth}px`
              : (minWidth ?? 'min-content'),
        }
      : undefined

  const table = (
    <table className={s.table} style={tableStyle}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const rowProps = getRowProps ? getRowProps(row, index) : undefined
          return (
            <tr key={index} {...rowProps}>
              {columns.map((column) => (
                <td key={column.key}>{row[column.key]}</td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )

  if (!scrollable) {
    return table
  }

  return <div className={s.scrollWrap}>{table}</div>
}
