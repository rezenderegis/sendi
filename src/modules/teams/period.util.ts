import { GoalPeriod } from './productivity-goal.entity';

export interface PeriodRange {
  start: Date;
  end: Date; // exclusivo
}

// Não existe timezone por empresa no sistema hoje — "hoje" é sempre a hora
// local do processo Node, igual ao resto do código (ex: follow-ons do dia na
// Agenda). Semana começa na segunda-feira (convenção comercial BR, decisão
// explícita já que não havia precedente no código).
export function periodRange(period: GoalPeriod, now: Date = new Date()): PeriodRange {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === GoalPeriod.WEEK) {
    const dow = start.getDay(); // 0=domingo..6=sábado
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    start.setDate(start.getDate() - diffToMonday);
  } else if (period === GoalPeriod.MONTH) {
    start.setDate(1);
  }

  const end = new Date(start);
  if (period === GoalPeriod.DAY) end.setDate(end.getDate() + 1);
  else if (period === GoalPeriod.WEEK) end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);

  return { start, end };
}
