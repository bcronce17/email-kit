import test from 'node:test';
import assert from 'node:assert/strict';
import { renderVerificationEmail, renderPasswordResetEmail, renderActionEmail } from '../dist/templates.js';
const options = {brand:{name:'Example & Co',accentColor:'#2563eb'},actionUrl:'https://example.com/verify?token=abc&next=home',expirationText:'This link expires in 24 hours.'};
test('account templates preserve action, plain text, expiry, and safe brand copy',()=>{
 for(const render of [renderVerificationEmail,renderPasswordResetEmail]){
  const message=render(options);
  assert.match(message.html,/Example &amp; Co/);
  assert.match(message.html,/token=abc&amp;next=home/);
  assert.ok(message.text.includes(options.actionUrl));
  assert.ok(message.html.includes(options.expirationText));
  assert.match(message.html,/role="presentation"/);
 }
 assert.match(renderPasswordResetEmail(options).text,/password will remain unchanged/);
});
test('action templates escape caller copy and reject unsafe URLs and styling',()=>{
 const action={...options,subject:'Hello',heading:'<img src=x>',introduction:'<script>alert(1)</script>',actionLabel:'Continue',securityText:'Ignore if unexpected'};
 const result=renderActionEmail(action);
 assert.ok(!result.html.includes('<script>'));
 assert.match(result.html,/&lt;img src=x&gt;/);
 for(const actionUrl of ['javascript:alert(1)','https://user:password@example.com/'])assert.throws(()=>renderActionEmail({...action,actionUrl}));
 assert.throws(()=>renderActionEmail({...action,brand:{name:'Example',accentColor:'red;display:none'}}));
 assert.throws(()=>renderActionEmail({...action,subject:'Hello\r\nBcc: other'}));
});
