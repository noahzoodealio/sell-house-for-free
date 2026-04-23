import { expect, test } from "@playwright/test";
import {
  captureEnrichResponse,
  captureSubmissionId,
  clickNext,
  expectEnrichmentStatus,
  fillAddress,
  fillCondition,
  fillContactAndConsent,
  gotoGetStarted,
  submit,
} from "./support/seller-form";

test.describe("E4 enrichment — happy path", () => {
  test("AZ address enriches, form submits, thanks URL carries submissionId", async ({
    page,
  }) => {
    await gotoGetStarted(page);
    const submissionId = await captureSubmissionId(page);

    await captureEnrichResponse(page, async () => {
      await fillAddress(page, "123 Main St");
    });

    await expectEnrichmentStatus(page, "ok");

    await clickNext(page);

    // The default happy fixture provides details (bedrooms/bathrooms/...) but
    // no photos, so the confirm-strip is allowed to be absent. Assert the
    // pre-fill hint is applied to at least one numeric input.
    const prefilled = page.locator('input[data-prefilled="true"]');
    await expect(prefilled.first()).toBeVisible();

    await clickNext(page);
    await fillCondition(page);
    await clickNext(page);
    await fillContactAndConsent(page);
    await submit(page);

    await expect(page).toHaveURL(
      new RegExp(
        `/get-started/thanks\\?ref=${submissionId}$`,
      ),
    );
  });
});
