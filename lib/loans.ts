export type BorrowCheck = { ok: true } | { ok: false; reason: string };

export function canBorrow(
  availableCopies: number,
  activeLoansCount: number,
  maxBooksPerStudent: number
): BorrowCheck {
  if (availableCopies <= 0) {
    return { ok: false, reason: "No copies available" };
  }
  if (activeLoansCount >= maxBooksPerStudent) {
    return { ok: false, reason: "Borrowing limit reached" };
  }
  return { ok: true };
}
