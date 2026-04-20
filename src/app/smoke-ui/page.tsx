import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Fieldset } from "@/components/ui/fieldset";
import { Label } from "@/components/ui/label";
import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { FormStep } from "@/components/ui/form-step";

export const metadata: Metadata = {
  title: "UI primitives smoke",
  robots: { index: false, follow: false },
};

const variants = ["primary", "secondary", "ghost"] as const;
const sizes = ["xs", "sm", "md", "lg", "xl"] as const;

export default function SmokeUI() {
  return (
    <main className="flex flex-col gap-12 bg-surface-tint px-6 py-16">
      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Button — variant × size
        </h2>
        <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] items-center gap-4">
          <div />
          {sizes.map((s) => (
            <div key={s} className="text-[14px] text-ink-muted">
              {s}
            </div>
          ))}
          {variants.map((v) => (
            <div key={v} className="contents">
              <div className="text-[14px] text-ink-muted">{v}</div>
              {sizes.map((s) => (
                <Button key={`${v}-${s}`} variant={v} size={s}>
                  Get started
                </Button>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-4">
          <Button disabled>Disabled primary</Button>
          <Button variant="secondary" disabled>
            Disabled secondary
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Input — idle / focused / error
        </h2>
        <div className="grid max-w-[var(--container-form)] gap-4">
          <Input placeholder="Idle" />
          <Input defaultValue="With value" />
          <Input placeholder="aria-invalid" aria-invalid />
          <Input placeholder="Disabled" disabled />
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Field — label + help + error
        </h2>
        <div className="grid max-w-[var(--container-form)] gap-6">
          <Field label="Email" helpText="We only use this to send the offer.">
            <Input type="email" placeholder="you@example.com" />
          </Field>
          <Field label="Phone" errorText="Please enter a valid US phone number.">
            <Input type="tel" defaultValue="123" />
          </Field>
          <Field
            label="ZIP"
            helpText="Help will be hidden when error shows."
            errorText="5 digits required."
          >
            <Input type="text" defaultValue="12" />
          </Field>
          <Field label="Bare (no help, no error)">
            <Input type="text" />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Fieldset — grouped placeholder
        </h2>
        <Fieldset legend="Contact info" className="max-w-[var(--container-form)]">
          <Field label="First name">
            <Input />
          </Field>
          <Field label="Last name">
            <Input />
          </Field>
          <Field label="Email">
            <Input type="email" />
          </Field>
        </Fieldset>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Label (standalone)
        </h2>
        <Label htmlFor="standalone">Standalone label (for id=&quot;standalone&quot;)</Label>
        <input id="standalone" className="mt-2 rounded border p-2" />
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Container — page / prose / form (nested)
        </h2>
        <Container>
          <div className="rounded border-2 border-dashed border-ink-muted p-4 text-[14px] text-ink-muted">
            Container size=&quot;page&quot; (max-w-1280, outer). Responsive padding.
            <Container size="prose" className="mt-4">
              <div className="rounded border border-ink-muted p-4 text-ink-body">
                Container size=&quot;prose&quot; (max-w-65ch). Ideal for article body.
              </div>
            </Container>
            <Container size="form" className="mt-4">
              <div className="rounded border border-ink-muted p-4 text-ink-body">
                Container size=&quot;form&quot; (max-w-560). Ideal for funnel steps.
              </div>
            </Container>
          </div>
        </Container>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Card — default / elevated / outlined
        </h2>
        <div className="grid gap-6 md:grid-cols-3 max-w-[var(--container-page)]">
          <Card>
            <h3 className="text-[18px] font-semibold text-ink-title">Default</h3>
            <p className="mt-2 text-[14px] text-ink-body">
              White surface, rounded-lg, p-6. No border, no shadow.
            </p>
          </Card>
          <Card variant="elevated">
            <h3 className="text-[18px] font-semibold text-ink-title">Elevated</h3>
            <p className="mt-2 text-[14px] text-ink-body">
              Adds --shadow-elevated (Figma Light/Shadow-6). No border.
            </p>
          </Card>
          <Card variant="outlined">
            <h3 className="text-[18px] font-semibold text-ink-title">Outlined</h3>
            <p className="mt-2 text-[14px] text-ink-body">
              1px border-border; no shadow. Choose one elevation treatment.
            </p>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          FormStep — progress 1/5, 3/5, 5/5
        </h2>
        <div className="flex flex-col gap-12">
          <FormStep
            currentStep={1}
            totalSteps={5}
            heading="Where's your property?"
            description="We'll use this address to pull public records."
          >
            <Field label="Street address">
              <Input placeholder="123 Main St" />
            </Field>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" disabled>Back</Button>
              <Button>Next</Button>
            </div>
          </FormStep>

          <FormStep
            currentStep={3}
            totalSteps={5}
            heading="How can we reach you?"
            description="We'll send your offer here."
          >
            <Field label="Email" helpText="We only use this to send the offer.">
              <Input type="email" placeholder="you@example.com" />
            </Field>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost">Back</Button>
              <Button>Next</Button>
            </div>
          </FormStep>

          <FormStep
            currentStep={5}
            totalSteps={5}
            heading="Review your details"
            description="Double-check before we pull your offer."
          >
            <p className="text-[16px] text-ink-body">Placeholder summary content.</p>
            <div className="mt-6 flex justify-between">
              <Button variant="ghost">Back</Button>
              <Button>Get my offer</Button>
            </div>
          </FormStep>
        </div>
      </section>
    </main>
  );
}
