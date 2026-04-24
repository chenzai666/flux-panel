import { tv } from "tailwind-variants";

export const title = tv({
  base: "tracking-tight inline font-semibold",
  variants: {
    color: {
      violet: "from-[#c26b2b] to-[#9f4f1b]",
      yellow: "from-[#d38b42] to-[#f3b87a]",
      blue: "from-[#5f7d8c] to-[#2f5569]",
      cyan: "from-[#7f9f92] to-[#5f8073]",
      green: "from-[#8ea76a] to-[#6f8a4b]",
      pink: "from-[#b67a5f] to-[#9d5f44]",
      foreground: "from-[#2a241d] to-[#6f6254]",
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
