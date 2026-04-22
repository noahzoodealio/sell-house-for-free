"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type EnrichmentPhoto = {
  url: string;
  caption?: string;
};

export type EnrichmentConfirmProps = {
  photos: EnrichmentPhoto[] | undefined;
  className?: string;
};

const MAX_PHOTOS = 3;

export function EnrichmentConfirm({ photos, className }: EnrichmentConfirmProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onNotMyHome = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", "address");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  if (!photos || photos.length === 0) return null;

  const visible = photos.slice(0, MAX_PHOTOS);

  return (
    <section
      aria-label="Is this your home?"
      className={className ?? "flex flex-col gap-2"}
    >
      <p className="text-[14px] leading-[20px] text-ink-body">
        Is this your home? If not, just edit the address.
      </p>
      <ul className="flex flex-wrap gap-2">
        {visible.map((photo, idx) => (
          <li
            key={photo.url}
            className="overflow-hidden rounded-md border border-border bg-surface"
          >
            <Image
              src={photo.url}
              alt={photo.caption ?? `Home photo ${idx + 1}`}
              width={120}
              height={90}
              sizes="120px"
              className="block size-auto"
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onNotMyHome}
        className="inline-flex min-h-[44px] items-center self-start px-2 py-2 text-[14px] leading-[20px] text-brand underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        Not my home — edit the address
      </button>
    </section>
  );
}
