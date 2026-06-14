import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, subDays, subMonths } from "date-fns";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");

  const [{ count: totalCards }, { data: cardDates }, { data: tagRows }, { data: recentTagRows }] = await Promise.all([
    supabase.from("cards").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("cards").select("date, created_at").eq("user_id", user.id).order("date", { ascending: false }),
    supabase.from("cards").select("tags").eq("user_id", user.id),
    supabase.from("cards").select("tags").eq("user_id", user.id).gte("date", thirtyDaysAgo),
  ]);

  // 최근 6개월 카드 수
  const monthly: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    monthly[format(subMonths(today, i), "yyyy-MM")] = 0;
  }
  cardDates?.forEach(({ date }) => {
    const key = (date as string).slice(0, 7);
    if (key in monthly) monthly[key]++;
  });

  function aggregateTags(rows: { tags: string[] }[] | null) {
    const counts: Record<string, number> = {};
    rows?.forEach(({ tags }) => {
      if (Array.isArray(tags)) {
        tags.forEach((tag: string) => { counts[tag] = (counts[tag] ?? 0) + 1; });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }

  const topTags = aggregateTags(tagRows as { tags: string[] }[] | null);
  const recentTopTags = aggregateTags(recentTagRows as { tags: string[] }[] | null);

  // 요일별 기록 분포 (0=일 ~ 6=토)
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  cardDates?.forEach(({ date }) => {
    const d = new Date((date as string) + "T00:00:00");
    dowCount[d.getDay()]++;
  });

  // 일별 카드 수 맵
  const dateCounts: Record<string, number> = {};
  cardDates?.forEach(({ date }) => {
    dateCounts[date as string] = (dateCounts[date as string] ?? 0) + 1;
  });

  // 이번 주 기록 수 및 요일별 개수
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekStr = format(startOfWeek, "yyyy-MM-dd");
  const thisWeekCount = cardDates?.filter(({ date }) => (date as string) >= startOfWeekStr).length ?? 0;
  const weekDayCounts = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = format(d, "yyyy-MM-dd");
    return { day: i, date: dateStr, count: dateCounts[dateStr] ?? 0 };
  });

  // 이번 달 기록률
  const thisMonthStr = format(today, "yyyy-MM");
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const thisMonthPassed = today.getDate();
  // 이번 달 일별 카드 수
  const dailyCounts = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = `${thisMonthStr}-${String(i + 1).padStart(2, "0")}`;
    return { date: dateStr, count: dateCounts[dateStr] ?? 0 };
  });

  const thisMonthRecorded = new Set(
    cardDates?.filter(({ date }) => (date as string).startsWith(thisMonthStr)).map(({ date }) => date)
  ).size;

  // 기록 시간대 (KST = UTC+9), 4구간
  const TIME_PERIODS = [
    { label: "새벽", start: 0, end: 5 },
    { label: "아침", start: 6, end: 11 },
    { label: "오후", start: 12, end: 17 },
    { label: "밤", start: 18, end: 23 },
  ];
  function aggregatePeriods(rows: { created_at: string }[]) {
    const counts = TIME_PERIODS.map((p) => ({ label: p.label, count: 0 }));
    rows.forEach(({ created_at }) => {
      if (!created_at) return;
      const hour = (new Date(created_at).getUTCHours() + 9) % 24;
      const idx = TIME_PERIODS.findIndex((p) => hour >= p.start && hour <= p.end);
      if (idx !== -1) counts[idx].count++;
    });
    return counts;
  }
  const periodCounts = aggregatePeriods((cardDates ?? []) as { created_at: string }[]);
  const recentPeriodCounts = aggregatePeriods(
    (cardDates ?? []).filter(({ date }) => (date as string) >= thirtyDaysAgo) as { created_at: string }[]
  );

  // 가장 활발한 날 Top 5
  const topDays = Object.entries(dateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({
    totalCards: totalCards ?? 0,
    thisWeekCount,
    weekDayCounts,
    thisMonthCount: monthly[format(today, "yyyy-MM")] ?? 0,
    monthly,
    dailyCounts,
    topTags,
    recentTopTags,
    periodCounts,
    recentPeriodCounts,
    topDays,
    dowCount,
    thisMonthRecorded,
    thisMonthPassed,
    daysInMonth,
  });
}
