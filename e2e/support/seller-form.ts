import { expect, type Page, type Response } from "@playwright/test";

/**
 * Shared helpers for the E4 enrichment specs. All four scenarios share the
 * same skeleton — only the `street1` trigger + the badge/UI assertions
 * differ — so the reusable bits live here.
 */

export async function gotoGetStarted(page: Page): Promise<void> {
  await page.goto("/get-started");
  // Wait for the form to hydrate — the hidden submissionId input is
  // populated post-mount.
  await expect(page.locator('input[name="submissionId"]')).toHaveValue(
    /^[0-9a-f-]{36}$/,
  );
}

export async function captureSubmissionId(page: Page): Promise<string> {
  const value = await page
    .locator('input[name="submissionId"]')
    .inputValue();
  expect(value).toMatch(/^[0-9a-f-]{36}$/);
  return value;
}

export async function fillAddress(
  page: Page,
  street1: string,
  city = "Phoenix",
  zip = "85001",
): Promise<void> {
  await page.getByRole("combobox", { name: /street address/i }).fill(street1);
  await page.getByLabel("City").fill(city);
  await page.getByLabel("ZIP code").fill(zip);
  // Blur to settle onChange debouncing.
  await page.getByLabel("ZIP code").blur();
}

export async function expectEnrichmentStatus(
  page: Page,
  status: "loading" | "ok" | "no-match" | "out-of-area" | "timeout" | "error",
): Promise<void> {
  const badge = page.locator('[data-enrichment-status]');
  await expect(badge).toHaveAttribute("data-enrichment-status", status);
}

export async function clickNext(page: Page): Promise<void> {
  await page.getByRole("button", { name: /next/i }).click();
}

export async function fillPropertyManually(page: Page): Promise<void> {
  await page.getByLabel("Bedrooms").fill("3");
  await page.getByLabel("Bathrooms").fill("2");
  await page.getByLabel("Square footage").fill("1500");
  await page.getByLabel("Year built").fill("2000");
  await page.getByLabel(/lot size/i).fill("6000");
}

export async function fillCondition(page: Page): Promise<void> {
  await page.getByRole("radio", { name: /move-in ready/i }).click();
  await page.getByLabel(/target timeline/i).selectOption("3-6mo");
}

export async function fillContactAndConsent(page: Page): Promise<void> {
  await page.getByLabel(/first name/i).fill("Test");
  await page.getByLabel(/last name/i).fill("Seller");
  await page.getByLabel(/email/i).fill("test@example.com");
  await page.getByLabel(/phone/i).fill("6025551234");
  await page
    .getByLabel(/i agree to tcpa phone contact/i)
    .check();
  await page.getByLabel(/i agree to the terms of service/i).check();
  await page
    .getByLabel(/i acknowledge the privacy policy/i)
    .check();
}

export async function submit(page: Page): Promise<void> {
  await page.getByRole("button", { name: /submit|get my offer|finish/i }).click();
}

/**
 * Capture the first `/api/enrich` response during an action + assert the
 * cache control header. Returns the response so callers can inspect further.
 */
export async function captureEnrichResponse(
  page: Page,
  action: () => Promise<void>,
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/enrich") && res.request().method() === "POST",
    ),
    action(),
  ]);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  return response;
}

export async function completeAndSubmit(
  page: Page,
  submissionId: string,
): Promise<void> {
  await clickNext(page);
  await fillCondition(page);
  await clickNext(page);
  await fillContactAndConsent(page);
  await submit(page);
  await expect(page).toHaveURL(
    new RegExp(`/portal/setup\\?sid=${submissionId}(?:&|$)`),
  );
}
