import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnrichmentConfirm } from "../enrichment-confirm";

const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=property&pillar=listing"),
}));

// next/image requires mocking in non-next test envs.
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

const photo = (url: string, caption?: string) => ({ url, caption });

describe("EnrichmentConfirm", () => {
  it("returns null when photos is undefined", () => {
    const { container } = render(<EnrichmentConfirm photos={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when photos is empty", () => {
    const { container } = render(<EnrichmentConfirm photos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders up to 3 thumbnails, dropping overflow", () => {
    render(
      <EnrichmentConfirm
        photos={[
          photo("https://zoodealiomls.blob.core.windows.net/mlsimages/a.jpg", "Front"),
          photo("https://zoodealiomls.blob.core.windows.net/mlsimages/b.jpg"),
          photo("https://zoodealiomls.blob.core.windows.net/mlsimages/c.jpg"),
          photo("https://zoodealiomls.blob.core.windows.net/mlsimages/d.jpg"),
        ]}
      />,
    );
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(3);
    expect(imgs[0].getAttribute("sizes")).toBe("120px");
    expect(imgs[0].getAttribute("width")).toBe("120");
    expect(imgs[0].getAttribute("height")).toBe("90");
  });

  it("renders the invitation caption", () => {
    render(
      <EnrichmentConfirm
        photos={[photo("https://zoodealiomls.blob.core.windows.net/mlsimages/a.jpg")]}
      />,
    );
    expect(
      screen.getByText(/is this your home\? if not, just edit the address\./i),
    ).toBeInTheDocument();
  });

  it('navigates to ?step=address when "Not my home" is clicked', async () => {
    mockReplace.mockReset();
    render(
      <EnrichmentConfirm
        photos={[photo("https://zoodealiomls.blob.core.windows.net/mlsimages/a.jpg")]}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /not my home/i }),
    );
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [target] = mockReplace.mock.calls[0];
    expect(target).toMatch(/step=address/);
    // Existing params (pillar) are preserved.
    expect(target).toMatch(/pillar=listing/);
  });
});
