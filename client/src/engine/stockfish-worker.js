import Stockfish from 'stockfish';

const engine = Stockfish();
onmessage = (e) => {
  engine.postMessage(e.data);
};
engine.onmessage = (line) => {
  postMessage(line);
};

