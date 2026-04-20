import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Fieldset } from "@/components/ui/fieldset";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio } from "@/components/ui/radio";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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
          Checkbox — unchecked / checked / disabled / error
        </h2>
        <div className="flex flex-col gap-3 max-w-[var(--container-form)]">
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Checkbox name="opt-in-1" />
            Unchecked
          </label>
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Checkbox name="opt-in-2" defaultChecked />
            Checked (native accent)
          </label>
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Checkbox name="opt-in-3" defaultChecked disabled />
            Disabled checked
          </label>
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Checkbox name="opt-in-4" aria-invalid />
            Error state (aria-invalid)
          </label>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Radio — grouped via Fieldset + shared name
        </h2>
        <Fieldset legend="Property type" className="max-w-[var(--container-form)]">
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Radio name="property-type" value="single-family" defaultChecked />
            Single-family home
          </label>
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Radio name="property-type" value="condo" />
            Condo
          </label>
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Radio name="property-type" value="townhouse" />
            Townhouse
          </label>
          <label className="flex items-center gap-3 text-[16px] text-ink-body">
            <Radio name="property-type" value="land" disabled />
            Land (disabled)
          </label>
        </Fieldset>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Select — idle / with-value / error / disabled
        </h2>
        <div className="grid max-w-[var(--container-form)] gap-4">
          <Field label="State (placeholder idiom)">
            <Select defaultValue="">
              <option value="" disabled>
                Select one…
              </option>
              <option value="AZ">Arizona</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
            </Select>
          </Field>
          <Field label="State (with value)">
            <Select defaultValue="AZ">
              <option value="AZ">Arizona</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
            </Select>
          </Field>
          <Field
            label="State (error)"
            errorText="Pick a state to see offers."
          >
            <Select defaultValue="">
              <option value="" disabled>
                Select one…
              </option>
              <option value="AZ">Arizona</option>
            </Select>
          </Field>
          <Field label="State (disabled)">
            <Select defaultValue="" disabled>
              <option value="" disabled>
                Select one…
              </option>
              <option value="AZ">Arizona</option>
            </Select>
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Textarea — idle / with-value / error / disabled
        </h2>
        <div className="grid max-w-[var(--container-form)] gap-4">
          <Field
            label="Notes (idle)"
            helpText="Share anything you'd like us to know."
          >
            <Textarea placeholder="Tell us about your property…" />
          </Field>
          <Field label="Notes (with value)">
            <Textarea defaultValue="Single-story ranch, 3 bed / 2 bath, detached garage." />
          </Field>
          <Field
            label="Notes (error)"
            errorText="Notes are limited to 500 characters."
          >
            <Textarea defaultValue="…" />
          </Field>
          <Field label="Notes (disabled)">
            <Textarea disabled defaultValue="Locked content." />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-[24px] font-semibold text-ink-title">
          Label (standalone)
        </h2>
        <Label htmlFor="standalone">Standalone label (for id=&quot;standalone&quot;)</Label>
        <input id="standalone" className="mt-2 rounded border p-2" />
      </section>
    </main>
  );
}
