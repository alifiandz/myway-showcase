export type PlanningReminder = { id: string; programmeId: string; university: string; kind: 'application' | 'enrolment'; date: string; daysRemaining: number; stage: number };
export function calendarDay(value: string): number | null {
 const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
 if (!match) return null;
 const [year,month,day] = match.slice(1).map(Number);
 const date = new Date(Date.UTC(year,month-1,day));
 if (year < 2000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month-1 || date.getUTCDate() !== day) return null;
 return date.getTime()/86400000;
}
export function buildPlanningReminders(applications: {p:{id:string;university:string};role:string}[], records: Record<string,string>, completed: string[], today: string, enabled: boolean): PlanningReminder[] {
 const current = calendarDay(today);
 if (!enabled || current === null) return [];
 const reminders: PlanningReminder[] = [];
 for (const {p,role} of applications) for (const [field,kind,action,stage] of [['deadline','application','submit',1],['enrolmentDeadline','enrolment','enrolment',8]] as const) {
  if (completed.includes(`${p.id}:${action}`) || (role === 'Dream' && completed.includes(action))) continue;
  const raw = records[`${p.id}:${field}`] || (role === 'Dream' ? records[field] : '') || '';
  const due = calendarDay(raw);
  if (due === null || due-current > 14) continue;
  reminders.push({id:`${p.id}:${field}`,programmeId:p.id,university:p.university,kind,date:raw.trim(),daysRemaining:due-current,stage});
 }
 return reminders.sort((a,b)=>a.daysRemaining-b.daysRemaining || a.id.localeCompare(b.id));
}
export function localCalendarDate(now: Date): string {
 return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
