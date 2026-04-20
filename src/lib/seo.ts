import type { Metadata } from "next";
import { SITE } from "./site";

type BuildMetadataArgs = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function buildMetadata({
  title,
  description,
  path,
  image,
}: BuildMetadataArgs): Metadata {
  const metadata: Metadata = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: "website",
      locale: SITE.locale,
      siteName: SITE.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };

  if (image) {
    metadata.openGraph = { ...metadata.openGraph, images: [image] };
    metadata.twitter = { ...metadata.twitter, images: [image] };
  }

  return metadata;
}
