/* global io */
(function () {
  const ROOMS = ['general', 'devops', 'random'];
  const $ = (id) => document.getElementById(id);
  const socket = io({ autoConnect: false });
  let me = null;
  let room = null;
  let typingTimer = null;
  const typers = new Set();

  function time(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollDown() {
    const list = $('messages');
    list.scrollTop = list.scrollHeight;
  }

  function addMessage(msg) {
    const li = document.createElement('li');
    li.className = 'msg' + (msg.username === me ? ' mine' : '');
    // msg.text is already HTML-escaped by the server
    li.innerHTML = '<span class="who"></span><span class="time"></span><div class="body"></div>';
    li.querySelector('.who').textContent = msg.username;
    li.querySelector('.time').textContent = time(msg.createdAt);
    li.querySelector('.body').innerHTML = msg.text;
    $('messages').appendChild(li);
    scrollDown();
  }

  function addNote(text, cls) {
    const li = document.createElement('li');
    li.className = cls || 'system';
    li.textContent = text;
    $('messages').appendChild(li);
    scrollDown();
  }

  function renderRooms() {
    const ul = $('rooms');
    ul.innerHTML = '';
    ROOMS.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = '# ' + r;
      if (r === room) li.className = 'active';
      li.onclick = () => r !== room && join(r);
      ul.appendChild(li);
    });
  }

  function renderTyping() {
    const names = [...typers];
    $('typing').textContent = names.length === 0 ? '' : names.join(', ') + (names.length === 1 ? ' is typing…' : ' are typing…');
  }

  function join(targetRoom, name) {
    socket.emit('join', { username: name || me, room: targetRoom }, (res) => {
      if (!res.ok) {
        $('login-error').textContent = res.error;
        return;
      }
      me = res.username;
      room = res.room;
      typers.clear();
      renderTyping();
      $('login').classList.add('hidden');
      $('chat').classList.remove('hidden');
      $('me').textContent = me;
      $('host').textContent = res.host;
      $('room-title').textContent = '# ' + room;
      document.title = me + ' · #' + room + ' · Real-Time Chat';
      $('messages').innerHTML = '';
      if (res.history.length) {
        res.history.forEach(addMessage);
        addNote('Earlier messages loaded from MongoDB', 'divider');
      } else {
        addNote('No messages yet in #' + room + '. Say hello!');
      }
      renderRooms();
      $('text').focus();
    });
  }

  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    $('login-error').textContent = '';
    if (!socket.connected) socket.connect();
    join($('room').value, $('username').value);
  });

  $('composer').addEventListener('submit', (e) => {
    e.preventDefault();
    const text = $('text').value;
    if (!text.trim()) return;
    socket.emit('message', text);
    socket.emit('typing', false);
    $('text').value = '';
  });

  $('text').addEventListener('input', () => {
    socket.emit('typing', true);
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.emit('typing', false), 1500);
  });

  socket.on('connect', () => {
    $('status').textContent = 'connected';
    $('status').className = 'status on';
    if (me && room) join(room); // rejoin after a reconnect (e.g. pod restart)
  });
  socket.on('disconnect', () => {
    $('status').textContent = 'reconnecting…';
    $('status').className = 'status off';
  });
  socket.on('message', (msg) => {
    typers.delete(msg.username);
    renderTyping();
    addMessage(msg);
  });
  socket.on('system', (text) => addNote(text));
  socket.on('users', (users) => {
    $('user-count').textContent = users.length;
    const ul = $('users');
    ul.innerHTML = '';
    users.forEach((u) => {
      const li = document.createElement('li');
      li.textContent = u === me ? u + ' (you)' : u;
      ul.appendChild(li);
    });
  });
  socket.on('typing', ({ username, isTyping }) => {
    if (isTyping) typers.add(username);
    else typers.delete(username);
    renderTyping();
  });

  socket.connect();
})();
