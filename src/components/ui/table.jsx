import * as React from "react"
import { cn } from "../../lib/utils"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <table
    ref={ref}
    className={cn("w-full caption-bottom text-sm", className)}
    {...props}
  />
))
Table.displayName = "Table"

export { Table }