import net from 'node:net';

// Real wire-level SMTP fixture: tracks attempts and can lose the acknowledgement after DATA.
export async function createSmtpFixture(behavior = 'accept') {
  const state = { connections: 0, attempts: 0, bodies: [], commands: [] };
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => sockets.delete(socket));
    state.connections++;

    if (behavior === 'silent') {
      return;
    }

    socket.write('220 fixture ESMTP\r\n');

    let buffer = '';
    let data = false;
    let body = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString();

      let index;

      while ((index = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, index);

        buffer = buffer.slice(index + 2);

        if (data) {
          if (line !== '.') {
            body += `${line}\r\n`;

            continue;
          }

          state.attempts++;
          state.bodies.push(body);
          body = '';
          data = false;

          if (behavior === 'disconnect') {
            socket.destroy();

            return;
          }

          socket.write('250 accepted\r\n');

          continue;
        }

        state.commands.push(line);

        if (/^EHLO/.test(line)) {
          socket.write('250-fixture\r\n250 8BITMIME\r\n');
        } else if (/^HELO|^MAIL FROM/.test(line)) {
          socket.write('250 OK\r\n');
        } else if (/^RCPT TO/.test(line)) {
          socket.write(behavior === 'reject' ? '550 mailbox rejected\r\n' : '250 OK\r\n');
        } else if (line === 'DATA') {
          data = true;
          socket.write('354 send data\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 bye\r\n');
        } else {
          socket.write('502 unsupported\r\n');
        }
      }
    });
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  async function close() {
    for (const socket of sockets) {
      socket.destroy();
    }

    await new Promise((resolve) => server.close(resolve));
  }

  return { state, port: server.address().port, close };
}
