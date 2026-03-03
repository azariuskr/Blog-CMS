import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings2 } from "lucide-react"
import { type VisibilityState } from "@tanstack/react-table"
import React from "react"

type DataTableViewOptionsProps<TData> = {
  table: Table<TData>
}

export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  // Get current table state from TanStack, but keep a React state mirror to trigger rerenders
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    table.getState().columnVisibility ?? {}
  )

  React.useEffect(() => {
    // Keep table in sync with React state
    table.setColumnVisibility(columnVisibility)
  }, [table, columnVisibility])

  // Keep React state in sync if something else changes visibility (optional)
  React.useEffect(() => {
    setColumnVisibility(table.getState().columnVisibility ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      }>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>

          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== "undefined" && column.getCanHide()
            )
            .map((column) => {
              const visible = column.getIsVisible()

              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  onSelect={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Toggle through React state so the component rerenders
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [column.id]: !visible,
                    }))
                  }}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              )
            })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
