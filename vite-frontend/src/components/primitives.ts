import { tv } from "tailwind-variants";

export const title = tv({
  base: "tracking-tight inline font-semibold",
  variants: {
    color: {
      neutral:
        "from-[var(--color-text-secondary)] to-[var(--color-text-primary)]",
      info: "from-[var(--color-semantic-info-text)] to-[var(--color-text-primary)]",
      success:
        "from-[var(--color-semantic-success-text)] to-[var(--color-text-primary)]",
      warning:
        "from-[var(--color-semantic-warning-text)] to-[var(--color-text-primary)]",
      danger:
        "from-[var(--color-semantic-danger-text)] to-[var(--color-text-primary)]",
      foreground:
        "from-[var(--color-text-primary)] to-[var(--color-text-secondary)]",
    },
    size: {
      sm: "text-3xl lg:text-4xl",
      md: "text-[2.3rem] lg:text-5xl leading-9",
      lg: "text-4xl lg:text-6xl",
    },
    fullWidth: {
      true: "w-full block",
    },
  },
  defaultVariants: {
    size: "md",
  },
  compoundVariants: [
    {
      color: ["neutral", "info", "success", "warning", "danger", "foreground"],
      class: "bg-clip-text text-transparent bg-gradient-to-b",
    },
  ],
});
