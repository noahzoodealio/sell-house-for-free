import type { ReactNode } from "react";
import Image from "next/image";

export type PMProfileProps = {
  name: string;
  role: string;
  bio: ReactNode;
  photo?: { src: string; alt: string; width: number; height: number };
  phone?: string;
  email?: string;
};

export function PMProfile({
  name,
  role,
  bio,
  photo,
  phone,
  email,
}: PMProfileProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6">
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="(min-width: 768px) 320px, 100vw"
          className="h-auto w-full max-w-[240px] rounded-lg"
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-[96px] items-center justify-center rounded-lg bg-brand-subtle text-[40px] font-semibold text-brand"
        >
          {initial}
        </div>
      )}
      <div>
        <h3 className="text-[20px] leading-[28px] font-semibold text-ink-title">
          {name}
        </h3>
        <p className="text-sm text-ink-muted">{role}</p>
      </div>
      <div className="text-[16px] leading-[24px] text-ink-body">
        {typeof bio === "string" ? <p>{bio}</p> : bio}
      </div>
      {phone || email ? (
        <ul role="list" className="flex flex-col gap-1 text-sm text-ink-body">
          {phone ? (
            <li>
              <a
                href={`tel:${phone}`}
                className="hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {phone}
              </a>
            </li>
          ) : null}
          {email ? (
            <li>
              <a
                href={`mailto:${email}`}
                className="hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {email}
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
