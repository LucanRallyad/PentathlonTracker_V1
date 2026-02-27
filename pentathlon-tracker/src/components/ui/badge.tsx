import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E99] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#37352F] text-white hover:bg-[#2F2E2B]",
        secondary:
          "border-transparent bg-[#F7F6F3] text-[#37352F] hover:bg-[#EFEFEF]",
        destructive:
          "border-transparent bg-[#E03E3E] text-white hover:bg-[#C02E2E]",
        outline: "text-[#37352F] border-[#E9E9E7]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
