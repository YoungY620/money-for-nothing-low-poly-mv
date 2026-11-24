import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Lumen Dark Button — elevated surface with three-layer shadow.
 * Depth principle applied:
 *   - Inset top-edge highlight (light from above)
 *   - Contact shadow (sharp, close)
 *   - Ambient shadow (soft, diffused)
 * Hover grows all three layers proportionally + background lightens.
 * Active flattens the shadow to simulate the button being pressed down.
 */

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-sm font-medium leading-none",
    "rounded-md cursor-pointer select-none",
    "transition-[background-color,box-shadow,transform] duration-fast",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:translate-y-px active:[box-shadow:var(--shadow-s)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-secondary-foreground " +
          "[box-shadow:var(--shadow-button)] " +
          "hover:bg-accent hover:text-foreground hover:[box-shadow:var(--shadow-button-hover)]",
        primary:
          "bg-primary text-primary-foreground " +
          "[box-shadow:var(--shadow-primary)] " +
          "hover:brightness-105 hover:[box-shadow:var(--shadow-button-hover),0_0.375rem_1rem_color-mix(in_oklch,var(--primary)_20%,transparent)]",
        secondary:
          "bg-muted text-muted-foreground " +
          "[box-shadow:var(--shadow-s)] " +
          "hover:bg-accent hover:text-accent-foreground hover:[box-shadow:var(--shadow-m)]",
        outline:
          "bg-transparent text-foreground border border-border " +
          "hover:bg-accent hover:border-ring/30",
        ghost:
          "bg-transparent text-muted-foreground " +
          "hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-destructive-foreground " +
          "[box-shadow:var(--shadow-button)] " +
          "hover:brightness-105 hover:[box-shadow:var(--shadow-button-hover)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends Omit<ButtonPrimitive.Props, "className">,
    VariantProps<typeof buttonVariants> {
  className?: string
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Callers written against the Radix API pass the element to become as a
    // child: <Button asChild><Link>…</Link></Button>. Base UI has no asChild,
    // it composes through `render`. Without this the prop reaches the DOM and
    // the anchor nests inside the button instead of replacing it, which stacks
    // the icon above the label and puts a link inside a button.
    if (asChild && React.isValidElement(props.children)) {
      const { children, ...rest } = props
      return (
        <ButtonPrimitive
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          {...rest}
          // After the spread, so an explicit asChild child wins over a stray
          // render prop rather than being silently replaced by it.
          // SAFETY: this branch runs only when `asChild` is set, and the caller then
          // owns passing a single element for the slot to clone.
          render={children as React.ReactElement}
        />
      )
    }

    return (
      <ButtonPrimitive
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
