import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarCells,shiftMonth} from '../src/calendar.ts';
test('calendar aligns Sunday columns, adjacent dates and a six-week month without losing recorded days',()=>{
 for(const month of ['2026-04','2026-08','2026-10','2028-02']){const cells=calendarCells(month);assert.equal(cells.length%7,0);assert.equal(new Date(cells[0].day+'T00:00:00Z').getUTCDay(),0);for(let n=1;n<cells.length;n++)assert.equal(Date.parse(cells[n].day)-Date.parse(cells[n-1].day),86400000);const days=cells.filter(cell=>cell.current);assert.equal(days[0].number,1);assert.equal(new Set(days.map(cell=>cell.day)).size,days.length);assert.equal(days.length,month==='2028-02'?29:month==='2026-04'?30:31);}
 assert.equal(calendarCells('2026-08').length,42);
 assert.equal(calendarCells('2026-04')[3].day,'2026-04-01');
});
test('month navigation crosses years without the device timezone shifting dates',()=>{assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');assert.equal(shiftMonth('2028-03',-1),'2028-02');});
test('month browsing stays valid at four-digit ISO year limits',()=>{assert.equal(shiftMonth('0001-01',-1),'0001-01');assert.equal(shiftMonth('0001-01',1),'0001-02');assert.equal(shiftMonth('9999-12',1),'9999-12');assert.equal(shiftMonth('9999-12',-1),'9999-11');for(const month of ['0001-01','9999-12']){const cells=calendarCells(month);assert.equal(new Set(cells.map(cell=>cell.day)).size,cells.length);assert.equal(cells.filter(cell=>cell.current).length,31);}});
