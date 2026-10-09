import { cn } from "@/lib/cn";

/*
 * Material Symbols Rounded, weight 300. Only the glyphs listed here are
 * downloaded, so add a name to ICON_NAMES before using a new icon.
 */
const ICON_NAMES = [
  "account_balance",
  "account_balance_wallet",
  "add",
  "arrow_back",
  "arrow_downward",
  "arrow_upward",
  "attach_money",
  "check",
  "chevron_left",
  "chevron_right",
  "close",
  "credit_card",
  "dark_mode",
  "delete",
  "directions_car",
  "donut_large",
  "download",
  "edit",
  "error",
  "event_repeat",
  "expand_more",
  "filter_alt_off",
  "flight",
  "home",
  "inventory_2",
  "light_mode",
  "local_activity",
  "logout",
  "mark_email_read",
  "medical_services",
  "monitoring",
  "more_horiz",
  "payments",
  "pets",
  "receipt_long",
  "restaurant",
  "savings",
  "school",
  "search",
  "sell",
  "settings",
  "shopping_bag",
  "shopping_cart",
  "subscriptions",
  "swap_horiz",
  "table_view",
  "trending_up",
  "upload_file",
  "wallet",
  "work",
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
