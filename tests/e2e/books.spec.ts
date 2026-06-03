import { test, expect } from "@playwright/test";

test.describe("Books — librarian CRUD + catalog", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as librarian before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "librarian@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/staff/dashboard");
  });

  test("librarian adds a book and it appears in catalog search", async ({ page }) => {
    const ts = Date.now();
    const uniqueTitle = `E2E Test Book ${ts}`;
    const uniqueIsbn = `TEST-${ts}`;

    // Navigate to books management
    await page.click("text=Books");
    await expect(page).toHaveURL("/staff/books");

    // Add new book
    await page.click("text=Add book");
    await expect(page).toHaveURL("/staff/books/new");

    await page.fill('input[name="title"]', uniqueTitle);
    await page.fill('input[name="author"]', "E2E Author");
    await page.fill('input[name="isbn"]', uniqueIsbn);
    await page.fill('input[name="totalCopies"]', "3");
    await page.click('button[type="submit"]');

    // Wait for redirect back to books management
    await page.waitForURL("/staff/books", { timeout: 10_000 });
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    // Search for it in catalog
    await page.click("text=Catalog");
    await expect(page).toHaveURL("/catalog");

    await page.fill('input[placeholder*="Search"]', uniqueTitle);
    await page.click('button[type="submit"]');

    const bookRow = page.getByRole("link", { name: new RegExp(uniqueTitle) });
    await expect(bookRow).toBeVisible();
    await expect(bookRow.getByText("3 available")).toBeVisible();
  });

  test("librarian can edit a book", async ({ page }) => {
    await page.goto("/staff/books");
    // Get the href from the first Edit link and navigate to it directly
    const editLink = page.locator("table tbody tr").first().getByRole("link", { name: "Edit" });
    const href = await editLink.getAttribute("href");
    await page.goto(href!);
    await expect(page.url()).toContain("/edit");

    await page.fill('input[name="title"]', "Updated Title E2E");
    await page.click('button[type="submit"]');

    await page.waitForURL("/staff/books", { timeout: 10_000 });
    await expect(page.getByRole("cell", { name: "Updated Title E2E" }).first()).toBeVisible();
  });

  test("student can browse catalog but not manage books", async ({ page }) => {
    // Log out and log in as student
    await page.click("text=Sign out");
    await page.fill('input[name="email"]', "student1@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/student/dashboard");

    // Can see catalog
    await page.click("text=Catalog");
    await expect(page).toHaveURL("/catalog");
    await expect(page.getByText("Book Catalog")).toBeVisible();

    // Cannot navigate to /staff/books (middleware redirects)
    await page.goto("/staff/books");
    await expect(page).toHaveURL("/student/dashboard");
  });
});
