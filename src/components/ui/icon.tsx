import { cn } from "@/lib/cn";

/*
 * Material Symbols Rounded, weight 300. Only the glyphs listed here are
 * downloaded, so add a name to ICON_NAMES before using a new icon.
 */
const ICON_NAMES = [
  "account_balance_wallet",
  "add",
  "arrow_drop_down",
  "arrow_drop_up",
  "chevron_left",
  "chevron_right",
  "dark_mode",
  "donut_large",
  "error",
  "home",
  "light_mode",
  "logout",
  "mark_email_read",
  "receipt_long",
  "settings",
  "trending_up",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const ICON_FONT_URL =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,300,0..1,0" +
  `&icon_names=${[...ICON_NAMES].sort().join(",")}&display=block`;

type IconProps = {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, size = 24, filled = false, className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      data-filled={filled}
      className={cn("icon", className)}
      style={{ fontSize: size, width: size, height: size }}
    >
      {name}
    </span>
  );
}
