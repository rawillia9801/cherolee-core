// FILE: lib/dashboard/hubCards.ts
// CHEROLEE CORE — Hub cards config (single source of truth)

export type HubCard = {
  key: string;
  title: string;
  description: string;
  href: string;
  kind: "internal" | "external";
  tag?: string;
};

export const HUB_CARDS: HubCard[] = [
  {
    key: "breeding",
    title: "Breeding Program",
    description: "Dogs • Litters • Puppies • Buyers • Records",
    href: "/dashboard/breeding",
    kind: "internal",
    tag: "Ops",
  },
  {
    key: "portal",
    title: "Portal Admin",
    description: "Applications • Docs • Messages • Content",
    href: "/dashboard/portal",
    kind: "internal",
    tag: "Control",
  },
  {
    key: "services",
    title: "Chihuahua.Services",
    description: "Products • Orders • Fulfillment • Customers",
    href: "/dashboard/chihuahua-services",
    kind: "internal",
    tag: "Store",
  },
  {
    key: "inventory",
    title: "Inventory Manager",
    description: "Stock • Adjustments • Low Stock • Value",
    href: "/dashboard/inventory",
    kind: "internal",
    tag: "Inventory",
  },

  // External “Open live site” cards (new tab)
  {
    key: "live_portal",
    title: "Open Live Portal",
    description: "portal.swvachihuahua.com (opens in new tab)",
    href: "https://portal.swvachihuahua.com",
    kind: "external",
    tag: "Live",
  },
  {
    key: "live_services",
    title: "Open Chihuahua.Services",
    description: "chihuahua.services (opens in new tab)",
    href: "https://chihuahua.services",
    kind: "external",
    tag: "Live",
  },
];