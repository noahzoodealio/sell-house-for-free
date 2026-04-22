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
  test("listed notice + agent question + photo strip render; currentListingStatus + hasAgent flow into the payload", async ({
    page,
  }) => {
    await gotoGetStarted(page);
    const submissionId = await captureSubmissionId(page);

    await captureEnrichResponse(page, async () => {
      await fillAddress(page, "__LISTED__");
    });

    await expectEnrichmentStatus(page, "ok");

    // Chip radiogroup — three reason chips.
    const chipGroup = page.getByRole("radiogroup", { name: /second opinion/i });
    await expect(chipGroup.getByRole("radio")).toHaveCount(3);

    const readyToSwitch = chipGroup.getByRole("radio", { name: /ready to switch/i });
    await readyToSwitch.click();
    await expect(readyToSwitch).toHaveAttribute("aria-checked", "true");

    // Hidden currentListingStatus field reflects the chip selection.
    await expect(
      page.locator('input[name="currentListingStatus"]'),
    ).toHaveValue("ready-to-switch");

    // Agent radiogroup — Yes / No / Not sure. Always renders for gated statuses.
    const agentGroup = page.getByRole("radiogroup", { name: /agent on this sale/i });
    await expect(agentGroup).toBeVisible();
    await expect(agentGroup.getByRole("radio")).toHaveCount(3);

    const yes = agentGroup.getByRole("radio", { name: /^yes$/i });
    await yes.click();
    await expect(yes).toHaveAttribute("aria-checked", "true");

    // Hidden hasAgent field is written only after selection.
    await expect(page.locator('input[name="hasAgent"]')).toHaveValue("yes");

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
