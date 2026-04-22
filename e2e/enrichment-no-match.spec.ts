import { expect, test } from "@playwright/test";
import {
  captureEnrichResponse,
  captureSubmissionId,
  clickNext,
  expectEnrichmentStatus,
  fillAddress,
  fillCondition,
  fillContactAndConsent,
  fillPropertyManually,
  gotoGetStarted,
  submit,
} from "./support/seller-form";

test.describe("E4 enrichment — no-match", () => {
  test("no-match badge renders; form advances and submits", async ({ page }) => {
    await gotoGetStarted(page);
    const submissionId = await captureSubmissionId(page);

    await captureEnrichResponse(page, async () => {
      await fillAddress(page, "__NOMATCH__");
    });

    await expectEnrichmentStatus(page, "no-match");
    await expect(
      page.getByText(
        "We couldn't find this address in public records — that's OK, you can keep going",
      ),
    ).toBeVisible();

    await clickNext(page);
    await fillPropertyManually(page);
    await clickNext(page);
    await fillCondition(page);
    await clickNext(page);
    await fillContactAndConsent(page);
    await submit(page);

    await expect(page).toHaveURL(
      new RegExp(`/get-started/thanks\\?ref=${submissionId}$`),
    );
  });
});
