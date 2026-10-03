export const base = { environment: 'test', from: { name: 'Test', address: 'sender@example.test' } };
export const message = {
  to: 'recipient@example.test',
  subject: 'Verification',
  text: 'Follow the link',
  html: '<p>Follow the link</p>'
};
export const capture = (port, overrides = {}) => ({
  ...base,
  mode: 'capture',
  smtp: { host: '127.0.0.1', port, tls: 'none', ...overrides }
});
