"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      gap={12}
      offset={16}
      toastOptions={{
        classNames: {
          toast: "font-sans text-sm rounded-2xl shadow-[0_8px_32px_rgba(45,41,38,0.12)] border border-[#D4CBC3]/60",
          success: "bg-white text-[#2D2926] border-[#D4CBC3]/60",
          error: "bg-white text-[#2D2926] border-[#F4D5D7]/80",
          info: "bg-white text-[#2D2926] border-[#D4CBC3]/60",
          warning: "bg-white text-[#2D2926] border-amber-200/60",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
