import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

async function main() {
  await db.rules.upsert({
    where: { id: 1 },
    update: {},
    create: {
      loanPeriodDays: 14,
      maxBooksPerStudent: 3,
      finePerDay: 0.5,
    },
  });

  const manager = await db.user.upsert({
    where: { email: "manager@library.dev" },
    update: { passwordHash: hashPassword("password123") },
    create: {
      name: "Alice Manager",
      email: "manager@library.dev",
      role: "manager",
      passwordHash: hashPassword("password123"),
    },
  });

  const librarian = await db.user.upsert({
    where: { email: "librarian@library.dev" },
    update: { passwordHash: hashPassword("password123") },
    create: {
      name: "Bob Librarian",
      email: "librarian@library.dev",
      role: "librarian",
      passwordHash: hashPassword("password123"),
    },
  });

  const student1 = await db.user.upsert({
    where: { email: "student1@library.dev" },
    update: { passwordHash: hashPassword("password123") },
    create: {
      name: "Carol Student",
      email: "student1@library.dev",
      role: "student",
      passwordHash: hashPassword("password123"),
    },
  });

  await db.user.upsert({
    where: { email: "student2@library.dev" },
    update: { passwordHash: hashPassword("password123") },
    create: {
      name: "Dan Student",
      email: "student2@library.dev",
      role: "student",
      passwordHash: hashPassword("password123"),
    },
  });

  const books = [
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", isbn: "9780743273565", totalCopies: 3 },
    { title: "To Kill a Mockingbird", author: "Harper Lee", isbn: "9780061935466", totalCopies: 2 },
    { title: "1984", author: "George Orwell", isbn: "9780451524935", totalCopies: 4 },
    { title: "Pride and Prejudice", author: "Jane Austen", isbn: "9780141439518", totalCopies: 2 },
    { title: "The Catcher in the Rye", author: "J.D. Salinger", isbn: "9780316769174", totalCopies: 2 },
    { title: "Brave New World", author: "Aldous Huxley", isbn: "9780060850524", totalCopies: 3 },
    { title: "The Hobbit", author: "J.R.R. Tolkien", isbn: "9780618260300", totalCopies: 3 },
    { title: "Fahrenheit 451", author: "Ray Bradbury", isbn: "9781451673319", totalCopies: 2 },
    { title: "The Alchemist", author: "Paulo Coelho", isbn: "9780062315007", totalCopies: 2 },
    { title: "Animal Farm", author: "George Orwell", isbn: "9780451526342", totalCopies: 3 },
  ];

  for (const book of books) {
    await db.book.upsert({
      where: { isbn: book.isbn },
      update: {},
      create: {
        ...book,
        availableCopies: book.totalCopies,
      },
    });
  }

  console.log("Seed complete:");
  console.log("  manager@library.dev / password123");
  console.log("  librarian@library.dev / password123");
  console.log("  student1@library.dev / password123");
  console.log("  student2@library.dev / password123");
  console.log(`  ${books.length} books`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
