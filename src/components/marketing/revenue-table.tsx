import { Container } from "@/components/layout/container";

export type RevenueStream = {
  id: string;
  label: string;
  whoPays: string;
  whenItActivates: string;
  note?: string;
};

export type RevenueTableProps = {
  streams: RevenueStream[];
};

export function RevenueTable({ streams }: RevenueTableProps) {
  return (
    <section className="py-12 md:py-16">
      <Container>
        <table className="w-full border-separate border-spacing-0 text-left">
          <caption className="mb-4 text-left text-[20px] leading-[28px] font-semibold text-ink-title">
            How we make money
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted"
              >
                Revenue stream
              </th>
              <th
                scope="col"
                className="border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted"
              >
                Who pays
              </th>
              <th
                scope="col"
                className="hidden border-b border-border pb-3 text-sm font-semibold uppercase tracking-wider text-ink-muted md:table-cell"
              >
                When it activates
              </th>
            </tr>
          </thead>
          <tbody>
            {streams.map((stream) => (
              <tr key={stream.id} className="align-top">
                <th
                  scope="row"
                  className="border-b border-border py-4 pr-6 text-[16px] leading-[24px] font-semibold text-ink-title"
                >
                  {stream.label}
                  <p className="mt-1 text-sm font-normal text-ink-muted md:hidden">
                    {stream.whenItActivates}
                  </p>
                </th>
                <td className="border-b border-border py-4 pr-6 text-[16px] leading-[24px] text-ink-body">
                  {stream.whoPays}
                  {stream.note ? (
                    <p className="mt-1 text-sm text-ink-muted">{stream.note}</p>
                  ) : null}
                </td>
                <td className="hidden border-b border-border py-4 text-[16px] leading-[24px] text-ink-body md:table-cell">
                  {stream.whenItActivates}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Container>
    </section>
  );
}
