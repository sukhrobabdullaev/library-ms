import "@testing-library/jest-dom";

// Provide env vars for all tests
process.env.AUTH_SECRET = "test-secret-at-least-32-chars-long!!";
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5438/library_ms";
