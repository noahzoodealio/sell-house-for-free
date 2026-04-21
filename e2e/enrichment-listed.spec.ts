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

test.describe("E4 enrichment — currently listed", () => {
  test("listed notice + photo strip render; currentListingStatus flows into the payload", async ({
    page,
  }) => {
    await gotoGetStarted(page);
    const submissionId = await captureSubmissionId(page);

    await captureEnrichResponse(page, async () => {
      await fillAddress(page, "__LISTED__");
    });

    await expectEnrichmentStatus(page, "ok");

    // Listed notice with three chips.
    const chips = page.getByRole("radio");
    await expect(chips).toHaveCount(3);

    const readyToSwitch = page.getByRole("radio", { name: /ready to switch/i });
    await readyToSwitch.click();
    await expect(readyToSwitch).toHaveAttribute("aria-checked", "true");

    // Hidden currentListingStatus field must reflect the selection before
    // submit. This is what E3-S8 Server Action consumes.
    await expect(
      page.locator('input[name="currentListingStatus"]'),
    ).toHaveValue("ready-to-switch");

    await clickNext(page);

    // Confirm strip: 3 thumbnails from the LISTED fixture.
    const confirmSection = page.getByRole("region", {
      name: /is this your home/i,
    });
    await expect(confirmSection.locator("img")).toHaveCount(3);

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
