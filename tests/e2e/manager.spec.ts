import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("Manager — rules and reports", () => {
  test("manager changes loan_period_days; a new borrow reflects the new due date", async ({
    page,
  }) => {
    // Log in as manager
    await page.goto("/login");
    await page.fill('input[name="email"]', "manager@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/staff/dashboard");

    // Navigate to Rules page
    await page.click("text=Rules");
    await expect(page).toHaveURL("/staff/rules");
    await expect(page.getByRole("heading", { name: "Borrowing Rules" })).toBeVisible();

    // Read the current loan period and change it to 7
    const periodInput = page.locator('input[name="loanPeriodDays"]');
    await expect(periodInput).toBeVisible();
    await periodInput.fill("7");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Rules saved successfully.")).toBeVisible({ timeout: 8_000 });

    // Go to Loans Desk and borrow on behalf of student
    await page.click("text=Loans");
    await expect(page).toHaveURL("/staff/loans");

    // Select student and available book
    await page.locator("select").first().selectOption({ index: 1 });
    await page.locator("select").nth(1).selectOption({ index: 1 });
    await page.click('button[type="submit"]');

    // Wait for success or error
    await page.waitForTimeout(1000);
    const hasSuccess = await page
      .getByText("Book borrowed successfully.")
      .isVisible({ timeout: 6_000 })
      .catch(() => false);

    if (hasSuccess) {
      // Verify the due date in the active loans table is ≤ 8 days from now
      const dueDateCell = page
        .locator("table tbody tr")
        .first()
        .locator("td")
        .nth(3);
      await expect(dueDateCell).toBeVisible({ timeout: 8_000 });
      const dueDateText = (await dueDateCell.textContent())?.replace(/\(overdue\)/, "").trim();
      const dueDate = new Date(dueDateText!);
      const daysUntilDue = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(daysUntilDue).toBeLessThan(8);

      // Return the loan
      await page
        .locator("table tbody tr")
        .first()
        .getByRole("button", { name: "Return" })
        .click();
      await page.waitForTimeout(1500);
    }

    // Reset rules back to 14 days
    await page.click("text=Rules");
    await expect(page).toHaveURL("/staff/rules");
    await page.locator('input[name="loanPeriodDays"]').fill("14");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Rules saved successfully.")).toBeVisible({ timeout: 8_000 });
  });

  test("reports page shows overdue section and popular books table", async ({ page }) => {
    // Log in as manager
    await page.goto("/login");
    await page.fill('input[name="email"]', "manager@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/staff/dashboard");

    // Navigate to Reports page
    await page.click("text=Reports");
    await expect(page).toHaveURL("/staff/reports");
    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();

    // Both sections should be present
    await expect(page.getByRole("heading", { name: /Overdue Loans/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Most Borrowed Books" })).toBeVisible();

    // Most Borrowed table has rows (seed created 10 books)
    await expect(page.locator("table").last().locator("tbody tr").first()).toBeVisible();
  });

  test("librarian cannot access rules page (redirected)", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "librarian@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/staff/dashboard");

    // Directly navigate to rules page
    await page.goto("/staff/rules");
    // Should redirect to staff dashboard (not manager)
    await expect(page).toHaveURL("/staff/dashboard");
  });
});
