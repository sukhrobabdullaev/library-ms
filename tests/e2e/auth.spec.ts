import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("student logs in and lands on student dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student1@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/student/dashboard");
    await expect(page.getByText("Student Dashboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student Dashboard" })).toBeVisible();
  });

  test("librarian logs in and lands on staff dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "librarian@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/staff/dashboard");
    await expect(page.getByText("Staff Dashboard")).toBeVisible();
  });

  test("manager logs in and lands on staff dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "manager@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL("/staff/dashboard");
    await expect(page.getByText("Staff Dashboard")).toBeVisible();
  });

  test("wrong password shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student1@library.dev");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/student/dashboard");
    await expect(page).toHaveURL("/login");
  });

  test("student cannot access staff dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student1@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/student/dashboard");

    await page.goto("/staff/dashboard");
    await expect(page).toHaveURL("/student/dashboard");
  });

  test("sign out redirects to login", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "student1@library.dev");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL("/student/dashboard");

    await page.click("text=Sign out");
    await expect(page).toHaveURL("/login");
  });
});
