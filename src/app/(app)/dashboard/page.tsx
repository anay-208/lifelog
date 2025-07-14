import { listTransactions } from "@/actions/finance/actions";
import { getGoals } from "@/actions/goals/actions";
import { listJournals } from "@/actions/journal/actions";
import { getStreak } from "@/actions/streak/actions";
import { route } from "@/app/routes";
import { serverAuth } from "@/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ComponentProps, type SVGProps } from "react";
import { AppContent, PageLocation, PageTitle } from "../content-layouts";
import { getTimeRange } from "../finance/time";
import { MaterialSymbolsBook2 } from "../sidebar";

export default function Page() {
  return (
    <AppContent>
      <PageLocation>Home</PageLocation>
      <PageTitle>Welcome back, User</PageTitle>

      <div className="grid grid-cols-1 gap-3 pt-12 md:grid-cols-2">
        <Card>
          <div className="">
            <CardTitle>
              <MaterialSymbolsBook2 className="size-5" />
              <h2>My Journals</h2>
            </CardTitle>
          </div>
          <div className="border-border mt-1 mt-4 flex grow flex-col rounded-xl border p-1 text-[0.9rem] font-medium">
            <Suspense>
              <UserRecentJournals />
            </Suspense>
          </div>
          <Button className="mt-4" asChild>
            <Link href={route.journal}>View All Journals</Link>
          </Button>
        </Card>

        <Card>
          <div>
            <CardTitle>
              <MaterialSymbolsLocalFireDepartmentRounded className="size-5" />
              <h2>Streaks</h2>
            </CardTitle>
          </div>
          <Suspense>
            <UserStreaksSummary />
          </Suspense>
        </Card>

        <Card>
          <div>
            <CardTitle>
              <MaterialSymbolsLocalFireDepartmentRounded className="size-5" />
              <h2>My Finances</h2>
            </CardTitle>
          </div>

          <div className="flex grow flex-col pt-2">
            <div className="flex flex-col gap-1">
              <div>Monthly Expenses</div>
              <div className="text-3xl">
                $
                <Suspense fallback="-">
                  <UserMonthlyExpenses />
                </Suspense>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="mt-2">Monthly Incomes</div>
              <div className="text-3xl">
                $
                <Suspense fallback="-">
                  <UserMonthlyIncomes />
                </Suspense>
              </div>
            </div>
          </div>

          <Button className="mt-4" asChild>
            <Link href={route.finance}>View My Finances</Link>
          </Button>
        </Card>

        <Card>
          <div>
            <CardTitle>
              <MaterialSymbolsLocalFireDepartmentRounded className="size-5" />
              <h2>My Goals</h2>
            </CardTitle>
          </div>
          <div className="mt-1 mt-4 flex grow flex-col rounded-xl py-1 text-[0.9rem] font-medium">
            <Suspense>
              <UserRecentGoals />
            </Suspense>
          </div>
          <Button className="mt-4" asChild>
            <Link href={route.goals}>View All Goals</Link>
          </Button>
        </Card>
      </div>
    </AppContent>
  );
}

async function UserRecentJournals() {
  await serverAuth.protectedPage("/dashboard");

  const journals = await listJournals({
    sort: { created_at: "desc" },
    pageSize: 3,
  });

  if (!journals.data || journals.data.length === 0) {
    return <div className="text-muted m-2">No journals found</div>;
  }

  if (journals.error) {
    return <div className="text-destroy m-2">Error fetching journals</div>;
  }

  return (
    <>
      {journals.data.map((j) => {
        return (
          <Link
            key={j.id}
            href={route.journalID(j.id)}
            className="hover:bg-hover flex items-center gap-2 rounded-lg p-2"
            prefetch={true}
          >
            <MaterialSymbolsAsterisk className="text-main-4/90 size-4.5 shrink-0" />
            <div className="line-clamp-1">
              {j.title || <span className="text-muted">Untitled Entry</span>}
            </div>
          </Link>
        );
      })}
    </>
  );
}

async function UserStreaksSummary() {
  await serverAuth.protectedPage("/dashboard");

  const streaks = await getStreak();

  if (!streaks || streaks.error) {
    return <div className="text-muted m-2">Error fetching streaks</div>;
  }

  function getMonday(date = new Date()) {
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  const thisMonday = getMonday();

  const thisWeekWeeklyStreaks = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ].map((weekDayLabel, i) => {
    const targetDate = new Date(thisMonday);
    targetDate.setDate(thisMonday.getDate() + i);

    const isPresent = streaks.data?.streakItems.some((streak) => {
      const streakDate = new Date(streak.date);
      streakDate.setHours(0, 0, 0, 0); // normalize

      return streakDate.getTime() === targetDate.getTime();
    });

    return {
      label: weekDayLabel,
      isPresent,
    };
  });

  return (
    <>
      <div className="pt-4">
        <div className="text-5xl font-bold">{streaks.data?.streakCount}</div>
        <div>day streak!</div>
      </div>

      <div className="bg-main-4/5 mt-4 flex items-center justify-between gap-1 rounded-md p-4 text-sm">
        {thisWeekWeeklyStreaks.map((day, index) => (
          <div
            key={index}
            className="mb-1 flex flex-1 grow flex-col items-center gap-1 font-semibold"
          >
            <div className="text-muted">{day.label}</div>
            <div
              className={cn(
                "flex w-full justify-center rounded-md py-2",
                day.isPresent ? "bg-amber-500" : "bg-muted/25",
              )}
            >
              <MaterialSymbolsLocalFireDepartmentRounded className="size-5 text-white" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

async function UserMonthlyExpenses() {
  await connection();
  let totalExpenses = 0;
  const timeRange = getTimeRange("this-month");
  const expenses = await listTransactions({
    timeRange: timeRange,
    filter: { type: "expense" },
  });
  if (expenses && expenses.data) {
    totalExpenses = Math.ceil(
      expenses.data.reduce((acc, cur) => acc + cur.amount, 0),
    );
  }
  return totalExpenses.toFixed(2);
}

async function UserMonthlyIncomes() {
  await connection();
  let totalIncome = 0;
  const timeRange = getTimeRange("this-month");
  const incomes = await listTransactions({
    timeRange: timeRange,
    filter: { type: "income" },
  });
  if (incomes && incomes.data) {
    totalIncome = Math.ceil(
      incomes.data.reduce((acc, cur) => acc + cur.amount, 0),
    );
  }
  return totalIncome.toFixed(2);
}

async function UserRecentGoals() {
  await serverAuth.protectedPage("/goals");
  const goals = await getGoals();
  if (goals.error || !goals.data)
    return <div className="text-red-500">Error fetching goals</div>;

  if (goals.data.length === 0)
    return <div className="text-muted m-2">No goals found</div>;

  return (
    <>
      {goals.data.slice(0, 3).map((j) => {
        return (
          <div key={j.id} className="flex items-center gap-2 rounded-lg py-2">
            <MaterialSymbolsTarget className="text-main-4/90 size-4.5 shrink-0" />
            <div className="line-clamp-1">
              {j.title || <span className="text-muted">Untitled Goal</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}

function MaterialSymbolsLocalFireDepartmentRounded(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}
      <path
        fill="currentColor"
        d="M7.9 20.875q-1.75-1.05-2.825-2.863Q4 16.2 4 14q0-2.825 1.675-5.425q1.675-2.6 4.6-4.55q.55-.375 1.138-.038Q12 4.325 12 5v1.3q0 .85.588 1.425q.587.575 1.437.575q.425 0 .813-.187q.387-.188.687-.538q.2-.25.513-.313q.312-.062.587.138Q18.2 8.525 19.1 10.275q.9 1.75.9 3.725q0 2.2-1.075 4.012q-1.075 1.813-2.825 2.863q.425-.6.663-1.313Q17 18.85 17 18.05q0-1-.375-1.887q-.375-.888-1.075-1.588L12 11.1l-3.525 3.475q-.725.725-1.1 1.6Q7 17.05 7 18.05q0 .8.238 1.512q.237.713.662 1.313ZM12 21q-1.25 0-2.125-.863Q9 19.275 9 18.05q0-.575.225-1.112q.225-.538.65-.963L12 13.9l2.125 2.075q.425.425.65.95q.225.525.225 1.125q0 1.225-.875 2.087Q13.25 21 12 21Z"
      ></path>
    </svg>
  );
}
function MaterialSymbolsAsterisk(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}
      <path
        fill="currentColor"
        d="M11 21v-6.6l-4.65 4.675l-1.425-1.425L9.6 13H3v-2h6.6L4.925 6.35L6.35 4.925L11 9.6V3h2v6.6l4.65-4.675l1.425 1.425L14.4 11H21v2h-6.6l4.675 4.65l-1.425 1.425L13 14.4V21z"
      ></path>
    </svg>
  );
}
function MaterialSymbolsTarget(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      {/* Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE */}
      <path
        fill="currentColor"
        d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-2q-2.5 0-4.25-1.75T6 12t1.75-4.25T12 6t4.25 1.75T18 12t-1.75 4.25T12 18m0-2q1.65 0 2.825-1.175T16 12t-1.175-2.825T12 8T9.175 9.175T8 12t1.175 2.825T12 16m0-2q-.825 0-1.412-.587T10 12t.588-1.412T12 10t1.413.588T14 12t-.587 1.413T12 14"
      ></path>
    </svg>
  );
}

function Card(props: ComponentProps<"div">) {
  return (
    <div className="border-border flex h-64 flex-col rounded-lg border p-6 shadow-sm">
      {props.children}
    </div>
  );
}
function CardTitle(props: ComponentProps<"div">) {
  return (
    <div className="flex items-center gap-1 text-lg font-semibold">
      {props.children}
    </div>
  );
}
