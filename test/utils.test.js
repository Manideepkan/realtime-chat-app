const test = require('node:test');
const assert = require('node:assert');
const { escapeHtml, cleanUsername, isValidRoom, buildMessage, MAX_MESSAGE_LENGTH } = require('../src/utils');

test('escapeHtml neutralises HTML tags', () => {
  assert.strictEqual(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('cleanUsername trims and accepts valid names', () => {
  assert.strictEqual(cleanUsername('  Manideep  '), 'Manideep');
  assert.strictEqual(cleanUsername('K.  Manideep'), 'K. Manideep');
});

test('cleanUsername rejects short, long or unsafe names', () => {
  assert.strictEqual(cleanUsername('a'), null);
  assert.strictEqual(cleanUsername('x'.repeat(21)), null);
  assert.strictEqual(cleanUsername('<b>bob</b>'), null);
  assert.strictEqual(cleanUsername(42), null);
});

test('isValidRoom only allows the configured rooms', () => {
  assert.ok(isValidRoom('general'));
  assert.ok(isValidRoom('devops'));
  assert.ok(!isValidRoom('admin'));
});

test('buildMessage rejects empty text', () => {
  assert.strictEqual(buildMessage('bob', 'general', '   '), null);
  assert.strictEqual(buildMessage('bob', 'general', undefined), null);
});

test('buildMessage escapes and truncates text', () => {
  const msg = buildMessage('bob', 'general', '<i>' + 'a'.repeat(600), new Date('2026-10-08T10:00:00Z'));
  assert.ok(msg.text.startsWith('&lt;i&gt;'));
  assert.strictEqual(msg.createdAt, '2026-10-08T10:00:00.000Z');
  assert.ok(msg.text.length <= MAX_MESSAGE_LENGTH + 10);
});
