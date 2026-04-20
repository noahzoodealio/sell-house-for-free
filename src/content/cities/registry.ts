import type { AzCitySlug } from "@/lib/routes";

export type CityEntry = {
  slug: AzCitySlug;
  displayName: string;
  county: string;
  populationApprox: number;
  neighborhoodsSampled: readonly string[];
  localProofPoint: string;
  heroImage: { src: string; alt: string; width: number; height: number } | null;
  intro: string;
  geo?: { latitude: number; longitude: number };
};

export const cities: readonly CityEntry[] = [
  {
    slug: "phoenix",
    displayName: "Phoenix",
    county: "Maricopa County",
    populationApprox: 1_650_000,
    neighborhoodsSampled: ["Arcadia", "Roosevelt Row", "North Central"],
    localProofPoint:
      "Active across central Phoenix neighborhoods including Arcadia and the North Central corridor.",
    heroImage: null,
    intro:
      "Phoenix homeowners can sell free under our licensed Arizona broker — listing, vetted cash offers, or a renovation-first path, all run by one Project Manager.",
    geo: { latitude: 33.4484, longitude: -112.074 },
  },
  {
    slug: "tucson",
    displayName: "Tucson",
    county: "Pima County",
    populationApprox: 545_000,
    neighborhoodsSampled: ["Sam Hughes", "Catalina Foothills", "Armory Park"],
    localProofPoint:
      "Working across central Tucson and the Catalina Foothills — single broker of record, no Tucson-specific markup.",
    heroImage: null,
    intro:
      "Tucson sellers get the same fee-free path: a Project Manager handles listing or cash-offer flows under our licensed Arizona broker.",
    geo: { latitude: 32.2226, longitude: -110.9747 },
  },
  {
    slug: "mesa",
    displayName: "Mesa",
    county: "Maricopa County",
    populationApprox: 510_000,
    neighborhoodsSampled: ["Eastmark", "Las Sendas", "Dobson Ranch"],
    localProofPoint:
      "Active in East Valley Mesa neighborhoods including Eastmark and Las Sendas.",
    heroImage: null,
    intro:
      "Mesa homeowners can sell free with us — full MLS listing, a vetted cash offer, or a Cash+ repair path before listing.",
    geo: { latitude: 33.4152, longitude: -111.8315 },
  },
  {
    slug: "chandler",
    displayName: "Chandler",
    county: "Maricopa County",
    populationApprox: 280_000,
    neighborhoodsSampled: ["Ocotillo", "Fulton Ranch", "Downtown Chandler"],
    localProofPoint:
      "Active throughout the East Valley including Ocotillo and Fulton Ranch in Chandler.",
    heroImage: null,
    intro:
      "Chandler sellers get a free path to market — your Project Manager prices the listing, walks every offer, and closes under our Arizona broker of record.",
    geo: { latitude: 33.3062, longitude: -111.8413 },
  },
  {
    slug: "scottsdale",
    displayName: "Scottsdale",
    county: "Maricopa County",
    populationApprox: 245_000,
    neighborhoodsSampled: ["Old Town", "DC Ranch", "McCormick Ranch"],
    localProofPoint:
      "Working across Old Town Scottsdale through DC Ranch and McCormick Ranch.",
    heroImage: null,
    intro:
      "Scottsdale homeowners can sell free under our licensed Arizona broker — listing, cash offers, Cash+ with Repairs, or our Renovation-Only path.",
    geo: { latitude: 33.4942, longitude: -111.9261 },
  },
  {
    slug: "gilbert",
    displayName: "Gilbert",
    county: "Maricopa County",
    populationApprox: 275_000,
    neighborhoodsSampled: ["Power Ranch", "Seville", "Agritopia"],
    localProofPoint:
      "Active in Gilbert master-planned communities including Power Ranch, Seville, and Agritopia.",
    heroImage: null,
    intro:
      "Gilbert sellers get fee-free listing and cash-offer paths — one Project Manager, one licensed AZ broker.",
    geo: { latitude: 33.3528, longitude: -111.789 },
  },
  {
    slug: "glendale",
    displayName: "Glendale",
    county: "Maricopa County",
    populationApprox: 250_000,
    neighborhoodsSampled: ["Arrowhead Ranch", "Westgate", "Historic Catlin Court"],
    localProofPoint:
      "Active in West Valley Glendale neighborhoods from Arrowhead Ranch through Westgate.",
    heroImage: null,
    intro:
      "Glendale homeowners can sell free with us — listing under our Arizona broker, a vetted cash offer, or a Cash+ repair path before market.",
    geo: { latitude: 33.5387, longitude: -112.186 },
  },
];
