import test from 'node:test';
import assert from 'node:assert/strict';
import * as t from '../dist/templates.js';
const base = { brand: {name:'Example & Co',accentColor:'#abd03f'}, actionUrl:'https://example.com/action?token=abc&next=home',
 expirationText:'This link expires in 24 hours.', linkPolicy:{allowedOrigins:['https://example.com']} };
const cases = [
 ['verification',t.renderVerificationEmail,base],
 ['password reset',t.renderPasswordResetEmail,base],
 ['invitation',t.renderInvitationEmail,{...base,resourceName:'The team'}],
 ['organization',t.renderOrganizationInvitationEmail,{...base,organizationName:'Builder & Sons'}],
 ['project',t.renderProjectInvitationEmail,{...base,organizationName:'Builder & Sons',projectName:'Kitchen renovation'}],
 ['portal',t.renderPortalInvitationEmail,{...base,communityName:'Willow Creek'}],
 ['announcement',t.renderAnnouncementEmail,{...base,senderName:'Willow Creek',title:'An update',body:'First paragraph.\n\nSecond paragraph.\nSecond line.'}],
 ['official notice',t.renderOfficialNoticeEmail,{...base,senderName:'Willow Creek',title:'Board meeting',body:'Please review the details.'}],
 ['notification',t.renderNotificationEmail,{...base,subject:'Task assigned',heading:'A task for you',summary:'Review this task.',details:[{label:'Project',value:'Kitchen'}]}],
 ['action',t.renderActionEmail,{...base,subject:'Review',heading:'Review request',introduction:'Please review.',actionLabel:'Review',securityText:'Contact the sender if unexpected.'}],
];
test('every template includes matching safe links, body text, and app branding',()=>{
 for (const [name,render,options] of cases) {
  const mail=render(options);
  assert.ok(mail.subject.length,name);
  assert.ok(mail.text.includes(base.actionUrl),name);
  assert.match(mail.html,/Example &amp; Co/);
  assert.match(mail.html,/token=abc&amp;next=home/);
  assert.match(mail.html,/role="presentation"/);
  assert.match(mail.html,/color:#000000;font-size:16px/); // Contrast on a light brand color.
  assert.ok(!mail.html.includes('<script'));
 }
});
test('token templates require app-owned expiry; content and notifications do not invent one',()=>{
 for (const [,render,options] of cases.filter(([name])=>!['announcement','official notice','notification'].includes(name))) {
  assert.ok(render(options).text.includes(base.expirationText));
  assert.throws(()=>render({...options,expirationText:undefined}),t.EmailTemplateError);
  assert.throws(()=>render({...options,expirationText:''}),t.EmailTemplateError);
 }
 for (const [,render,options] of cases.filter(([name])=>['announcement','official notice','notification'].includes(name))) {
  const {expirationText,...contentOptions}=options;
  assert.ok(!render(contentOptions).text.includes('expires'));
 }
});
test('all templates reject unsafe schemes, credentials, insecure remote URLs, and off-origin links',()=>{
 for (const [,render,options] of cases) {
  for (const actionUrl of ['javascript:alert(1)','data:text/html,hello','https://user:pass@example.com','http://example.com','https://evil.example/action','https://example.com.evil.test','https://example.com/\nsecret']) {
   assert.throws(()=>render({...options,actionUrl}),t.EmailTemplateError);
  }
 }
 const local={...base,actionUrl:'http://localhost:3100/verify',linkPolicy:{allowLocalHttp:true,allowedOrigins:['http://localhost:3100']}};
 assert.ok(t.renderVerificationEmail(local).text.includes(local.actionUrl));
 assert.throws(()=>t.renderVerificationEmail({...local,linkPolicy:{allowLocalHttp:false}}));
 assert.throws(()=>t.renderVerificationEmail({...local,actionUrl:'http://remote.example/verify',linkPolicy:{allowLocalHttp:true}}));
 assert.throws(()=>t.renderVerificationEmail({...base,linkPolicy:{allowedOrigins:[]}}));
 assert.throws(()=>t.renderVerificationEmail({...base,linkPolicy:{allowedOrigins:['https://example.com/path']}}));
});
test('escapes content, validates subjects and theme values, and never renders caller HTML',()=>{
 const attack='<img src=x onerror="alert(1)">';
 for (const [,render,options] of cases) {
  const mail=render({...options,brand:{name:attack,footerText:attack},copy:{heading:attack,introduction:attack,actionLabel:attack,securityText:attack}});
  assert.ok(!mail.html.includes('<img'));
  assert.ok(mail.html.includes('&lt;img'));
  assert.ok(mail.text.includes(attack));
  assert.throws(()=>render({...options,subject:'Hello\r\nBcc: private@example.com'}));
  assert.throws(()=>render({...options,brand:{name:'Example',accentColor:'red;display:none'}}));
 }
 assert.throws(()=>t.renderVerificationEmail({...base,language:'en" onclick="x'}));
});
test('announcement copy preserves paragraphs and preferences without making delivery claims',()=>{
 const options={...base,senderName:'Community',title:'Meeting <details>',body:'First & next.\n\nSecond <script>.\nLast line.',preferencesUrl:'https://example.com/settings'};
 const mail=t.renderOfficialNoticeEmail(options);
 assert.match(mail.html,/Official notice/);
 assert.match(mail.html,/Second &lt;script&gt;.<br>Last line/);
 assert.ok(mail.text.includes(options.body));
 assert.ok(mail.text.includes(options.preferencesUrl));
 assert.ok(!mail.text.includes('legally delivered'));
 assert.throws(()=>t.renderAnnouncementEmail({...options,preferencesUrl:'https://other.example/settings'}));
 assert.throws(()=>t.renderNotificationEmail({...cases[8][2],preferencesUrl:'javascript:alert(1)'}));
});
test('consumers can customize copy and metadata across every renderer',()=>{
 for(const [,render,options] of cases){
  const mail=render({...options,subject:'Custom subject',language:'fr',copy:{heading:'Bonjour',introduction:'Une mise à jour.',actionLabel:'Continuer',securityText:'Texte de sécurité.',eyebrow:'Compte',preheader:'Aperçu',fallbackText:'Copiez ce lien :',preferencesLabel:'Préférences'}});
  assert.equal(mail.subject,'Custom subject');
  assert.match(mail.html,/<html lang="fr">/);
  for(const value of ['Bonjour','Une mise à jour.','Continuer','Texte de sécurité.'])assert.ok(mail.text.includes(value));
  assert.ok(mail.html.includes('Aperçu'));
 }
});
