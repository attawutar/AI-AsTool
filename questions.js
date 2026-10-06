const { randomBytes, createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

// Put QNA_DATA_FILE on a Railway volume to retain boards across deployments.
module.exports = function registerQuestions(io, dataFile = process.env.QNA_DATA_FILE || path.join(__dirname, 'data', 'questions.json')) {
  const boards = new Map(fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')).map(b => [b.code, b]) : []);
  const hash = token => createHash('sha256').update(token).digest('hex');
  const save = () => {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile + '.tmp', JSON.stringify([...boards.values()]));
    fs.renameSync(dataFile + '.tmp', dataFile);
  };
  const normalize = code => typeof code === 'string' ? code.trim().toUpperCase() : '';
  const snapshot = board => ({ code: board.code, title: board.title, questions: board.questions });
  io.on('connection', socket => {
    const handle = (event, handler) => socket.on(event, (payload, cb) => {
      try { handler(payload || {}, typeof cb === 'function' ? cb : () => {}); }
      catch (error) {
        console.error(`[Q&A] ${event} failed`, error);
        if (typeof cb === 'function') cb({ success: false, error: 'Could not save this change. Please try again.' });
      }
    });
    handle('qna-create', ({ title }, cb) => {
      if (typeof title !== 'string' || !title.trim() || title.trim().length > 100)
        return cb({ success: false, error: 'Enter a session title (up to 100 characters).' });
      let code;
      do { code = randomBytes(4).toString('hex').toUpperCase(); } while (boards.has(code));
      const hostToken = randomBytes(32).toString('hex');
      const board = { code, title: title.trim(), hostHash: hash(hostToken), questions: [] };
      boards.set(code, board);
      try { save(); } catch (error) { boards.delete(code); throw error; }
      socket.join('qna_' + code);
      cb({ success: true, ...snapshot(board), hostToken });
    });
    handle('qna-join', ({ code, hostToken }, cb) => {
      const board = boards.get(normalize(code));
      if (!board) return cb({ success: false, error: 'Session not found. Check your code.' });
      socket.join('qna_' + board.code);
      cb({ success: true, ...snapshot(board), isHost: typeof hostToken === 'string' && hash(hostToken) === board.hostHash });
    });
    handle('qna-submit', ({ code, text, name, requestId }, cb) => {
      const board = boards.get(normalize(code));
      if (!board || !socket.rooms.has('qna_' + board.code))
        return cb({ success: false, error: 'Join the session before sending a question.' });
      if (typeof text !== 'string' || !text.trim() || text.trim().length > 500 ||
          (name !== undefined && (typeof name !== 'string' || name.trim().length > 60)) ||
          typeof requestId !== 'string' || requestId.length > 80 || !requestId)
        return cb({ success: false, error: 'Enter a question (up to 500 characters) and a name up to 60 characters.' });
      // Retried acknowledgements must not create duplicate questions.
      if (board.questions.some(q => q.id === requestId)) return cb({ success: true });
      if (Date.now() - (socket.data.lastQuestionAt || 0) < 2000)
        return cb({ success: false, error: 'Please wait a moment before sending another question.' });
      if (board.questions.length >= 1000) return cb({ success: false, error: 'The board is full. Ask the speaker to remove answered questions.' });
      const question = { id: requestId, text: text.trim(), name: name?.trim() || 'Anonymous', createdAt: Date.now() };
      board.questions.push(question);
      try { save(); } catch (error) { board.questions.pop(); throw error; }
      socket.data.lastQuestionAt = Date.now();
      io.to('qna_' + board.code).emit('qna-update', snapshot(board));
      cb({ success: true });
    });
    handle('qna-delete', ({ code, hostToken, questionId }, cb) => {
      const board = boards.get(normalize(code));
      if (!board || typeof hostToken !== 'string' || hash(hostToken) !== board.hostHash)
        return cb({ success: false, error: 'Only the speaker can delete questions.' });
      const previous = board.questions;
      board.questions = previous.filter(q => q.id !== questionId);
      try { save(); } catch (error) { board.questions = previous; throw error; }
      io.to('qna_' + board.code).emit('qna-update', snapshot(board));
      cb({ success: true });
    });
    handle('qna-leave', ({ code }, cb) => { socket.leave('qna_' + normalize(code)); cb({ success: true }); });
  });
};
