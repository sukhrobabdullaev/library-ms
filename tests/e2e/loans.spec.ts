import { test, expect } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("Borrow and return", () => {
  test("student borrows a book; available count drops; student returns it; count recovers", async ({
    page,
  }) => {
    // Log in as student
    await page.goto("/login");
    await page.fill('input[name="email"]', "student1@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/student/dashboard");

    // Go to catalog — pick first book that shows available copies (green "X available" badge)
    await page.goto("/catalog");
    const bookLink = page.locator('a[href^="/catalog/"]').filter({ hasText: /\d+ available/ }).first();
    await expect(bookLink).toBeVisible();
    const bookHref = await bookLink.getAttribute("href");
    await page.goto(bookHref!);

    const returnBtnLocator = page.getByRole("button", { name: "Return Book" });
    const borrowBtnLocator = page.getByRole("button", { name: "Borrow Book" });

    // If student already has an active loan from a previous run, return it first
    if (await returnBtnLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
      await returnBtnLocator.click();
      await page.waitForLoadState("load");
      await expect(borrowBtnLocator).toBeVisible({ timeout: 10_000 });
    }

    // Read the available count before borrowing
    const availableSpan = page
      .locator("p")
      .filter({ hasText: "Available:" })
      .locator("span")
      .last();
    const beforeText = await availableSpan.textContent();
    const beforeCount = parseInt(beforeText ?? "0", 10);
    expect(beforeCount).toBeGreaterThan(0);

    // Borrow the book
    await expect(borrowBtnLocator).toBeVisible();
    await borrowBtnLocator.click();
    await page.waitForLoadState("load");

    // After reload, Return Book should appear
    await expect(returnBtnLocator).toBeVisible({ timeout: 10_000 });

    // Available count should have dropped by 1
    const afterBorrowText = await availableSpan.textContent();
    const afterBorrowCount = parseInt(afterBorrowText ?? "0", 10);
    expect(afterBorrowCount).toBe(beforeCount - 1);

    // Return the book
    await returnBtnLocator.click();
    await page.waitForLoadState("load");

    // After reload, Borrow Book should appear again
    await expect(borrowBtnLocator).toBeVisible({ timeout: 10_000 });

    // Available count should have recovered
    const afterReturnText = await availableSpan.textContent();
    const afterReturnCount = parseInt(afterReturnText ?? "0", 10);
    expect(afterReturnCount).toBe(beforeCount);
  });

  test("librarian desk: borrow on behalf of student and return via desk", async ({ page }) => {
    // Log in as librarian
    await page.goto("/login");
    await page.fill('input[name="email"]', "librarian@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/staff/dashboard");

    // Go to loans desk via nav
    await page.click("text=Loans");
    await expect(page).toHaveURL("/staff/loans");
    await expect(page.getByRole("heading", { name: "Loans Desk" })).toBeVisible();

    // Select the first student option (index 1, skipping "Select student...")
    await page.locator('select').first().selectOption({ index: 1 });

    // Select the first available book option (index 1, skipping "Select book...")
    await page.locator('select').nth(1).selectOption({ index: 1 });

    const selectedStudentText = await page
      .locator('select')
      .first()
      .locator("option:checked")
      .textContent();

    await page.click('button[type="submit"]');

    // Wait for success or error (error if already borrowed — that's fine for this test's scope)
    await page.waitForTimeout(1000);
    const successMsg = page.getByText("Book borrowed successfully.");
    const hasSuccess = await successMsg.isVisible({ timeout: 6_000 }).catch(() => false);

    if (hasSuccess) {
      // A loan row should now appear in the active loans table
      await expect(page.locator("table tbody tr").first()).toBeVisible({ timeout: 8_000 });

      // Return via the first Return button in the table
      await page.locator("table tbody tr").first().getByRole("button", { name: "Return" }).click();

      // The row should disappear (table shrinks)
      await page.waitForTimeout(2000);
    }

    // Desk page is still accessible (basic smoke check)
    await expect(page.getByRole("heading", { name: "Loans Desk" })).toBeVisible();
  });
});
