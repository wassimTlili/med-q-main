
/**
 * @file Sidebar input component
 * 
 * A styled input field designed specifically for use within the sidebar.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

/**
 * Sidebar input component
 * 
 * A styled version of the Input component specifically for use within
 * the sidebar, with appropriate styling for search fields and other inputs.
 */
export const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  )
})
SidebarInput.displayName = "SidebarInput"
