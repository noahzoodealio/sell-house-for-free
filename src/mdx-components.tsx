import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type MdxImgProps = Omit<
  ComponentProps<"img">,
  "alt" | "width" | "height" | "src" | "ref"
> & {
  src: string;
  alt: string;
  width: number;
  height: number;
};

function flattenChildrenToText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(flattenChildrenToText).join("");
  return "link";
}

function MdxAnchor({ href, children, ...rest }: ComponentProps<"a">) {
  if (!href) return <a {...rest}>{children}</a>;

  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }

  if (/^https?:\/\//i.test(href)) {
    const label = flattenChildrenToText(children);
    return (
      <a
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        aria-label={`${label} (opens in new tab)`}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

function MdxImage({ src, alt, width, height, sizes, ...rest }: MdxImgProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes ?? "100vw"}
      {...rest}
    />
  );
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: (props) => (
      <h1
        className="text-[40px] leading-[48px] font-semibold scroll-mt-24"
        {...props}
      />
    ),
    h2: (props) => (
      <h2
        className="text-[30px] leading-[38px] font-semibold scroll-mt-24"
        {...props}
      />
    ),
    h3: (props) => (
      <h3
        className="text-[24px] leading-[32px] font-semibold scroll-mt-24"
        {...props}
      />
    ),
    h4: (props) => (
      <h4
        className="text-[20px] leading-[28px] font-semibold scroll-mt-24"
        {...props}
      />
    ),
    h5: (props) => (
      <h5
        className="text-[18px] leading-[26px] font-semibold scroll-mt-24"
        {...props}
      />
    ),
    h6: (props) => (
      <h6
        className="text-[16px] leading-[24px] font-semibold scroll-mt-24"
        {...props}
      />
    ),
    p: (props) => (
      <p className="text-[16px] leading-[24px] text-ink-body" {...props} />
    ),
    strong: (props) => <strong className="font-semibold" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    ul: (props) => <ul className="list-disc pl-6" {...props} />,
    ol: (props) => <ol className="list-decimal pl-6" {...props} />,
    li: (props) => <li className="marker:text-ink-muted" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="border-l-4 border-brand pl-4 italic text-ink-body"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="rounded bg-surface-muted px-1 py-0.5 font-mono text-[0.9em]"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="rounded-lg bg-surface-muted p-4 overflow-x-auto"
        {...props}
      />
    ),
    hr: (props) => <hr className="my-8 border-border" {...props} />,
    a: MdxAnchor,
    img: MdxImage as MDXComponents["img"],
  };
}
