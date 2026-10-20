import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlanningReminders,calendarDay,localCalendarDate} from '../src/planning-reminders.ts';
const apps=[{p:{id:'one',university:'University One'},role:'Dream'},{p:{id:'two',university:'University Two'},role:'Target'}];
test('reminders respect pause, due-today and the 14-day window',()=>{
 const records={'one:deadline':'2026-10-09','two:deadline':'2026-10-23'};
 assert.equal(buildPlanningReminders(apps,records,[],'2026-10-09',false).length,0);
 assert.deepEqual(buildPlanningReminders(apps,records,[],'2026-10-09',true).map(x=>x.daysRemaining),[0,14]);
 assert.equal(buildPlanningReminders(apps,{'two:deadline':'2026-10-24'},[],'2026-10-09',true).length,0);
});
test('completed applications disappear and scoped records do not leak to another application',()=>{
 const records={deadline:'2026-10-09','one:enrolmentDeadline':'2026-10-08'};
 const list=buildPlanningReminders(apps,records,['one:submit'],'2026-10-09',true);
 assert.deepEqual(list.map(x=>[x.programmeId,x.kind,x.daysRemaining,x.stage]),[['one','enrolment',-1,8]]);
 assert.equal(buildPlanningReminders(apps,records,['submit','enrolment'],'2026-10-09',true).length,0);
});
test('unknown, ambiguous and impossible dates never produce fabricated deadline alerts',()=>{
 for(const value of ['2026-02-30','09/10/2026','October 9','2026-13-01','2026-00-01','']) assert.equal(calendarDay(value),null);
 assert.notEqual(calendarDay('2028-02-29'),null);
 assert.equal(buildPlanningReminders(apps,{'one:deadline':'Not yet verified'},[],'2026-10-09',true).length,0);
 assert.equal(localCalendarDate(new Date(2026,9,9)),'2026-10-09');
});
