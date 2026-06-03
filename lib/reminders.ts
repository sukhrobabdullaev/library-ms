export type LoanForReminder = {
  id: string;
  dueAt: Date;
  returnedAt: Date | null;
  reminderSent: boolean;
  userId: string;
  user: { email: string; name: string };
  book: { title: string };
};

export type SentNotification = {
  loanId: string;
  type: string;
};

export type ReminderTask = {
  loanId: string;
  userId: string;
  userEmail: string;
  userName: string;
  bookTitle: string;
  dueAt: Date;
  type: "due_soon" | "overdue" | "over_limit";
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function selectReminders(
  loans: LoanForReminder[],
  sentNotifications: SentNotification[],
  maxBooksPerStudent: number,
  now: Date = new Date()
): ReminderTask[] {
  const sent = new Set(sentNotifications.map((n) => `${n.loanId}:${n.type}`));
  const tasks: ReminderTask[] = [];

  const activeLoans = loans.filter((l) => l.returnedAt === null);

  // Group all active loans by student for the over-limit check
  const studentLoans = new Map<string, LoanForReminder[]>();
  for (const loan of activeLoans) {
    const list = studentLoans.get(loan.userId) ?? [];
    list.push(loan);
    studentLoans.set(loan.userId, list);
  }

  // Due-soon / overdue per loan
  for (const loan of activeLoans) {
    if (loan.reminderSent) continue;

    const daysUntilDue = (loan.dueAt.getTime() - now.getTime()) / MS_PER_DAY;

    let type: "due_soon" | "overdue" | null = null;
    if (daysUntilDue <= -1) {
      type = "overdue";
    } else if (daysUntilDue >= 0 && daysUntilDue <= 2) {
      type = "due_soon";
    }

    if (type && !sent.has(`${loan.id}:${type}`)) {
      tasks.push({
        loanId: loan.id,
        userId: loan.userId,
        userEmail: loan.user.email,
        userName: loan.user.name,
        bookTitle: loan.book.title,
        dueAt: loan.dueAt,
        type,
      });
    }
  }

  // Over-limit: one notification per student who holds more than the max
  for (const [userId, userLoans] of studentLoans) {
    if (userLoans.length <= maxBooksPerStudent) continue;
    if (userLoans.some((l) => sent.has(`${l.id}:over_limit`))) continue;

    const target = userLoans.find((l) => !l.reminderSent) ?? userLoans[0];
    tasks.push({
      loanId: target.id,
      userId,
      userEmail: target.user.email,
      userName: target.user.name,
      bookTitle: target.book.title,
      dueAt: target.dueAt,
      type: "over_limit",
    });
  }

  return tasks;
}
