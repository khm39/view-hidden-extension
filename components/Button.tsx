import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonVariant = "primary" | "secondary" | "icon" | "icon-ghost"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "px-3.5 py-1.5 text-xs font-medium rounded-md",
    "border-none cursor-pointer",
    "transition-colors duration-150",
    "bg-btn-primary-bg text-btn-primary-text",
    "hover:bg-btn-primary-bg-hover"
  ].join(" "),

  secondary: [
    "px-3.5 py-1.5 text-xs font-medium rounded-md",
    "border-none cursor-pointer",
    "transition-colors duration-150",
    "bg-btn-secondary-bg text-btn-secondary-text",
    "hover:bg-btn-secondary-bg-hover"
  ].join(" "),

  icon: [
    "flex items-center justify-center w-8 h-8",
    "border-none bg-bg-tertiary rounded-md",
    "text-text-secondary cursor-pointer",
    "transition-colors duration-150",
    "hover:bg-accent hover:text-white"
  ].join(" "),

  "icon-ghost": [
    "flex items-center justify-center w-7 h-7",
    "border-none bg-transparent rounded-md",
    "text-text-secondary cursor-pointer",
    "transition-colors duration-150",
    "hover:bg-bg-hover hover:text-text-primary"
  ].join(" ")
}

export function Button({
  variant = "primary",
  children,
  className,
  ...props
}: ButtonProps) {
  const classes = className
    ? `${variantClasses[variant]} ${className}`
    : variantClasses[variant]

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  )
}
