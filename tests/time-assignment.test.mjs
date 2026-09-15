import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assignmentLabel,validTimeAssignment,usedCorrectionRounds} from '../src/lib/correction-rounds.ts';
test('customer scope changes require documentation and never consume a correction round',()=>{
 const change={correction_round:null,change_request:'Kunde wünscht statt der freigegebenen Startseite einen neuen Aufbau.'};
 assert.equal(validTimeAssignment(change),true);
 assert.match(assignmentLabel(change,5),/Abänderung.*Separat abzurechnen/);
 assert.equal(validTimeAssignment({...change,correction_round:1}),false);
 assert.equal(validTimeAssignment({...change,change_request:'  '}),false);
 assert.equal(validTimeAssignment({...change,change_request:'a'.repeat(2001)}),false);
 assert.deepEqual(usedCorrectionRounds([{project_id:'a',...change},{project_id:'a',correction_round:1,change_request:null}],'a'),[1]);
 assert.equal(validTimeAssignment({correction_round:null,change_request:null}),true);
});
