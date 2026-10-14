import { cn } from "@/lib/cn";

/*
 * Material Symbols Rounded, weight 300. Only the glyphs listed here are
 * downloaded, so add a name to ICON_NAMES before using a new icon.
 */
const ICON_NAMES = [
  "account_balance",
  "account_balance_wallet",
  "add",
  "apartment",
  "arrow_back",
  "arrow_downward",
  "arrow_upward",
  "attach_money",
  "auto_awesome",
  "beach_access",
  "candlestick_chart",
  "celebration",
  "check",
  "check_circle",
  "chevron_left",
  "chevron_right",
  "close",
  "credit_card",
  "currency_bitcoin",
  "dark_mode",
  "delete",
  "directions_car",
  "donut_large",
  "download",
  "edit",
  "error",
  "event",
  "event_repeat",
  "expand_more",
  "favorite",
  "filter_alt_off",
  "flag",
  "flight",
  "home",
  "inventory_2",
  "laptop_mac",
  "light_mode",
  "local_activity",
  "lock",
  "logout",
  "mark_email_read",
  "medical_services",
  "monitoring",
  "more_horiz",
  "north_east",
  "payments",
  "pets",
  "public",
  "receipt_long",
  "refresh",
  "remove",
  "restaurant",
  "savings",
  "schedule",
  "school",
  "search",
  "sell",
  "send",
  "settings",
  "shopping_bag",
  "shopping_cart",
  "stacked_line_chart",
  "subscriptions",
  "swap_horiz",
  "sync_problem",
  "table_view",
  "trending_up",
  "upload_file",
  "wallet",
  "warning",
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
