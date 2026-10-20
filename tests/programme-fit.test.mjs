import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateProgramFit, selectRecommendations } from '../src/programme-fit.ts';
const program = { title: 'Business Management', curriculum: ['Management','Exchange','Internships'], entry: 'Bachelor’s programme available', math: 'Not yet verified', location: 'France', language: 'English', tuition: 'See the current official fee schedule', experience: 'Exchange and internships' };
const profile = { fields: 'Management', countries: 'France', language: 'English' };
const study = { status: 'bachelor', areas: ['Management'] };

test('an unconfirmed must-have cannot receive Good/Strong fit or enter recommendations', () => {
 const required = calculateProgramFit(program, study, profile, { Scholarships: 'Must have' });
 const preferred = calculateProgramFit(program, study, profile, { Scholarships: 'Prefer' });
 assert.equal(required.label, 'Must-have unverified');
 assert.deepEqual(required.mustHaveGaps, ['Scholarships']);
 assert.ok(required.score < 60);
 assert.ok(preferred.score > required.score);
 assert.deepEqual(selectRecommendations([{id:'required'},{id:'preferred'}], {required,preferred}).map(x=>x.id), ['preferred']);
});
test('confirmed must-have evidence remains eligible; negative mentions do not count', () => {
 const confirmed = calculateProgramFit({...program, experience:'Scholarships available'}, study, profile, {Scholarships:'Must have'});
 const negative = calculateProgramFit({...program, experience:'Scholarships are not confirmed'}, study, profile, {Scholarships:'Must have'});
 assert.deepEqual(confirmed.mustHaveGaps, []);
 assert.deepEqual(negative.mustHaveGaps, ['Scholarships']);
 assert.deepEqual(selectRecommendations([{id:'confirmed'},{id:'negative'}], {confirmed,negative}).map(x=>x.id), ['confirmed']);
});
test('recommendations consider the complete supplied candidate set', () => {
 const catalogue = Array.from({length:100},(_,i)=>({id:`synthetic-programme-${String(i).padStart(3,'0')}`}));
 const fits = Object.fromEntries(catalogue.map(x=>[x.id,calculateProgramFit(program,study,profile,{})]));
 const last=catalogue.at(-1);
 fits[last.id]={...fits[last.id],score:100,mustHaveGaps:[]};
 assert.equal(selectRecommendations(catalogue,fits)[0].id,last.id);
});
test('missing profile and all unconfirmed must-haves produce no fabricated recommendations', () => {
 const blank = calculateProgramFit(program,study,{},{});
 const unknown = calculateProgramFit(program,study,profile,{Scholarships:'Must have'});
 assert.deepEqual(selectRecommendations([{id:'blank'},{id:'unknown'}],{blank,unknown}),[]);
});
