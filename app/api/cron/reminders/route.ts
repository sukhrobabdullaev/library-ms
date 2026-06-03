import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { selectReminders, type ReminderTask } from "@/lib/reminders";

function buildEmailBody(task: ReminderTask): { to: string; subject: string; html: string } {
  const { userEmail, userName, bookTitle, dueAt, type } = task;

  if (type === "due_soon") {
    return {
      to: userEmail,
      subject: `Reminder: "${bookTitle}" is due soon`,
      html: `<p>Hi ${userName},</p><p>Your loan of <strong>${bookTitle}</strong> is due on ${dueAt.toDateString()}. Please return it on time.</p>`,
    };
  }

  if (type === "overdue") {
    return {
      to: userEmail,
      subject: `Overdue: Please return "${bookTitle}"`,
      html: `<p>Hi ${userName},</p><p>Your loan of <strong>${bookTitle}</strong> was due on ${dueAt.toDateString()} and is now overdue. Please return it as soon as possible.</p>`,
    };
  }

  return {
    to: userEmail,
    subject: `Borrowing limit reached`,
    html: `<p>Hi ${userName},</p><p>You have reached your borrowing limit. Please return a book before borrowing more.</p>`,
  };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [activeLoans, sentNotifications, rules] = await Promise.all([
    db.loan.findMany({
      where: { returnedAt: null },
      include: { user: true, book: true },
    }),
    db.notification.findMany({
      select: { loanId: true, type: true },
    }),
    db.rules.findFirst(),
  ]);

  const maxBooks = rules?.maxBooksPerStudent ?? 3;
  const tasks = selectReminders(activeLoans, sentNotifications, maxBooks);

  for (const task of tasks) {
    await sendEmail(buildEmailBody(task));
    await db.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          userId: task.userId,
          loanId: task.loanId,
          type: task.type,
        },
      });
      await tx.loan.update({
        where: { id: task.loanId },
        data: { reminderSent: true },
      });
    });
  }

  return NextResponse.json({ sent: tasks.length });
}
