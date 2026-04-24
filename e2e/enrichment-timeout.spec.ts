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

test.describe("E4 enrichment — timeout", () => {
  test("timeout badge renders; form still submits with manual property entry", async ({
    page,
  }) => {
    await gotoGetStarted(page);
    const submissionId = await captureSubmissionId(page);

    await captureEnrichResponse(page, async () => {
      await fillAddress(page, "__TIMEOUT__");
    });

    await expectEnrichmentStatus(page, "timeout");
    await expect(
      page.getByText(
        "Couldn't reach our records right now — you can keep going",
      ),
    ).toBeVisible();

    const nextBtn = page.getByRole("button", { name: /^next$/i });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    await fillPropertyManually(page);
    await clickNext(page);
    await fillCondition(page);
    await clickNext(page);
    await fillContactAndConsent(page);
    await submit(page);

    await expect(page).toHaveURL(
      new RegExp(`/portal/setup\\?sid=${submissionId}(?:&|$)`),
    );
  });
});
