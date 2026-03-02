// FILE: app/dashboard/projects.ts
// CHEROLEE — Dashboard Hub Card Registry
//
// CHANGELOG
// - Central registry for all dashboard cards (titles, descriptions, icons, routes, external URLs).
// - Keeps /dashboard/page.tsx small and consistent.
// - Powers dynamic project pages at /dashboard/p/[slug].

export type ProjectCard = {
  slug: string;              // internal route slug
  title: string;             // card title
  subtitle: string;          // card subtitle
  icon: "shield" | "globe" | "home" | "paw" | "file" | "id" | "crown" | "heart" | "scale" | "server" | "wand" | "pen";
  accent: "cyan" | "purple" | "amber" | "rose" | "emerald" | "blue" | "zinc";
  href: string;              // internal route (usually /dashboard/p/<slug> or a dedicated page)
  externalUrl?: string;      // optional: show external open button
};

export type ProjectSection = {
  title: string;
  description?: string;
  cards: ProjectCard[];
};

export const DASHBOARD_SECTIONS: ProjectSection[] = [
  {
    title: "Southwest Virginia Chihuahua",
    description: "Breeding ops, portal, knowledge, services, and doc publishing.",
    cards: [
      {
        slug: "breeding-program",
        title: "Breeding Program",
        subtitle: "Manage dogs, litters, buyers, and records.",
        icon: "shield",
        accent: "cyan",
        href: "/dashboard/p/breeding-program",
      },
      {
        slug: "portal-admin",
        title: "portal.swvachihuahua.com",
        subtitle: "Portal admin + customer records.",
        icon: "globe",
        accent: "blue",
        href: "/dashboard/p/portal-admin",
        externalUrl: "https://portal.swvachihuahua.com",
      },
      {
        slug: "chihuahuahq",
        title: "ChihuahuaHQ.com",
        subtitle: "Knowledge hub & resources.",
        icon: "home",
        accent: "amber",
        href: "/dashboard/p/chihuahuahq",
        externalUrl: "https://chihuahuahq.com",
      },
      {
        slug: "chihuahua-services",
        title: "Chihuahua.Services",
        subtitle: "Guides, training, and digital products.",
        icon: "paw",
        accent: "purple",
        href: "/dashboard/p/chihuahua-services",
        externalUrl: "https://chihuahua.services",
      },
      {
        slug: "dogbreederweb",
        title: "DogBreederWeb.Site",
        subtitle: "Breeder website platform.",
        icon: "paw",
        accent: "emerald",
        href: "/dashboard/p/dogbreederweb",
      },
      {
        slug: "dogbreederdocs",
        title: "DogBreederDocs.Site",
        subtitle: "Contracts, packets, docs publishing.",
        icon: "file",
        accent: "purple",
        href: "/dashboard/p/dogbreederdocs",
      },
      {
        slug: "mydogportal",
        title: "MyDogPortal.Site",
        subtitle: "Member portal & dog-owner services.",
        icon: "id",
        accent: "blue",
        href: "/dashboard/p/mydogportal",
      },
    ],
  },
  {
    title: "Family + Local Projects",
    description: "The smaller brands and local ventures — same polished look.",
    cards: [
      {
        slug: "marionsweets",
        title: "MarionSweets.com",
        subtitle: "Seasonal menus, orders, and delivery.",
        icon: "crown",
        accent: "rose",
        href: "/dashboard/p/marionsweets",
        externalUrl: "https://marionsweets.com",
      },
      {
        slug: "trails-tails",
        title: "Trails & Tails VA",
        subtitle: "Walk scheduling and client payouts.",
        icon: "paw",
        accent: "emerald",
        href: "/dashboard/p/trails-tails",
      },
      {
        slug: "legalize-alabama",
        title: "Legalize Alabama",
        subtitle: "Advocacy campaign management.",
        icon: "scale",
        accent: "blue",
        href: "/dashboard/p/legalize-alabama",
      },
      {
        slug: "cherolee",
        title: "Cherolee.com",
        subtitle: "Master brand / hub site.",
        icon: "crown",
        accent: "zinc",
        href: "/dashboard/p/cherolee",
        externalUrl: "https://cherolee.com",
      },
      {
        slug: "cheralyns",
        title: "Cheralyns.com",
        subtitle: "Family / brand site.",
        icon: "heart",
        accent: "rose",
        href: "/dashboard/p/cheralyns",
        externalUrl: "https://cheralyns.com",
      },
    ],
  },
  {
    title: "Financial Administration",
    description: "Recurring obligations, investments, and domain renewals/DNS.",
    cards: [
      {
        slug: "bills-manager",
        title: "Bills Manager",
        subtitle: "Recurring obligations.",
        icon: "file",
        accent: "rose",
        href: "/dashboard/p/bills-manager",
      },
      {
        slug: "investments",
        title: "Investments",
        subtitle: "Growth & targets.",
        icon: "globe",
        accent: "emerald",
        href: "/dashboard/p/investments",
      },
      {
        slug: "domain-registry",
        title: "Domain Registry",
        subtitle: "Renewals & DNS.",
        icon: "globe",
        accent: "blue",
        href: "/dashboard/p/domain-registry",
      },
    ],
  },
  {
    title: "Sales Channels",
    description: "Orders, revenue, profit, fees — per channel pages.",
    cards: [
      {
        slug: "walmart-marketplace",
        title: "Walmart Marketplace",
        subtitle: "Retail orders, revenue, profit, fees.",
        icon: "home",
        accent: "blue",
        href: "/dashboard/p/walmart-marketplace",
      },
      {
        slug: "walmart-wfs",
        title: "Walmart Fulfillment Services (WFS)",
        subtitle: "Inbound, fulfillment fees, storage/shipping.",
        icon: "server",
        accent: "amber",
        href: "/dashboard/p/walmart-wfs",
      },
      {
        slug: "ebay",
        title: "eBay Marketplace",
        subtitle: "Orders, fees, shipping, profit.",
        icon: "globe",
        accent: "zinc",
        href: "/dashboard/p/ebay",
      },
    ],
  },
  {
    title: "Build + Hosting Tools",
    description: "Your builder and hosting console — consistent, not an oddball.",
    cards: [
      {
        slug: "hostmyweb",
        title: "HOSTMYWEB.CO",
        subtitle: "Reseller hosting console.",
        icon: "server",
        accent: "zinc",
        href: "/dashboard/p/hostmyweb",
        externalUrl: "https://hostmyweb.co",
      },
      {
        slug: "buildio",
        title: "Build.io",
        subtitle: "AI site builder & deployments.",
        icon: "wand",
        accent: "purple",
        href: "/dashboard/p/buildio",
      },
      {
        slug: "logocreator",
        title: "LogoCreator.Site",
        subtitle: "Logos, branding, and exports.",
        icon: "pen",
        accent: "amber",
        href: "/dashboard/p/logocreator",
      },
      {
        slug: "esignvirginia",
        title: "eSignVirginia.com",
        subtitle: "eSign workflows and templates.",
        icon: "file",
        accent: "blue",
        href: "/dashboard/p/esignvirginia",
      },
    ],
  },
];

export const ALL_CARDS: ProjectCard[] = DASHBOARD_SECTIONS.flatMap((s) => s.cards);

export function findCardBySlug(slug: string): ProjectCard | undefined {
  return ALL_CARDS.find((c) => c.slug === slug);
}