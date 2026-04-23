import { tv } from "tailwind-variants";

export const title = tv({
  base: "tracking-tight inline font-semibold",
  variants: {
    color: {
      violet: "from-[#c96442] to-[#a85e4c]",
      yellow: "from-[#c96442] to-[#e07d55]",
      blue: "from-[#3b7dd8] to-[#5b9ae6]",
      cyan: "from-[#2d8a56] to-[#3da86a]",
      green: "from-[#2d8a56] to-[#4aae78]",
      pink: "from-[#c96442] to-[#d4856a]",
      foreground: "dark:from-[#e8e2da] dark:to-[#a09a94]",
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
      color: [
        "violet",
        "yellow",
        "blue",
        "cyan",
        "green",
        "pink",
        "foreground",
      ],
      class: "bg-clip-text text-transparent bg-gradient-to-b",
    },
  ],
});
