type ClassValue = string | false | undefined | null | Record<string, boolean>;

export function cn(...classes: ClassValue[]): string {
  return classes
    .map((c) => {
      if (!c) return "";
      if (typeof c === "string") return c;
      return Object.entries(c)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(" ");
    })
    .filter(Boolean)
    .join(" ");
}
