import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';

function generateMathPuzzle() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, answer;
  if (op === '+') { a = Math.floor(Math.random() * 40) + 5; b = Math.floor(Math.random() * 40) + 5; answer = a + b; }
  else if (op === '-') { a = Math.floor(Math.random() * 40) + 20; b = Math.floor(Math.random() * (a - 1)) + 1; answer = a - b; }
  else { a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; answer = a * b; }
  return { question: `What is ${a} ${op} ${b}?`, answer: String(answer), type: 'math' };
}

function generateWordPuzzle() {
  const puzzles = [
    { question: '🐱 + 🐶 = how many animals?', answer: '2' },
    { question: 'How many sides does a triangle have?', answer: '3' },
    { question: 'How many days are in a week?', answer: '7' },
    { question: 'How many hours in a day?', answer: '24' },
    { question: 'Spell the color of the sky on a clear day (one word)', answer: 'blue' },
    { question: 'What comes after Monday? (one word)', answer: 'tuesday' },
    { question: '🍎🍎🍎 — how many apples?', answer: '3' },
    { question: 'How many legs does a spider have?', answer: '8' },
    { question: 'What is the opposite of "hot"? (one word)', answer: 'cold' },
    { question: 'How many months in a year?', answer: '12' },
  ];
  return { ...puzzles[Math.floor(Math.random() * puzzles.length)], type: 'word' };
}

function generatePuzzle() {
  return Math.random() > 0.5 ? generateMathPuzzle() : generateWordPuzzle();
}

export default function PuzzleChallenge({ onSolved }) {
  const [puzzle, setPuzzle] = useState(null);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => { setPuzzle(generatePuzzle()); }, []);

  const refresh = () => { setPuzzle(generatePuzzle()); setInput(''); setError(''); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const correct = input.trim().toLowerCase() === puzzle.answer.toLowerCase();
    if (correct) {
      onSolved();
    } else {
      setError('Not quite! Give it another shot 😅');
      setShake(true);
      setTimeout(() => { setShake(false); setError(''); }, 800);
    }
  };

  if (!puzzle) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className={`bg-[hsl(228,7%,27%)] rounded-2xl p-6 text-center transition-all ${shake ? 'animate-bounce' : ''}`}>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 font-semibold">
          {puzzle.type === 'math' ? '🧮 Math Challenge' : '🧩 Quick Puzzle'}
        </p>
        <p className="text-xl font-bold text-white leading-snug">{puzzle.question}</p>
      </div>

      {error && (
        <p className="text-center text-sm text-red-400 font-medium">{error}</p>
      )}

      <input
        autoFocus
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Your answer…"
        className="w-full bg-[hsl(228,8%,27%)] text-white text-center text-lg font-semibold rounded-xl px-4 py-3 border border-[hsl(225,9%,20%)] focus:outline-none focus:border-primary/60 placeholder:text-[hsl(220,7%,40%)]"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-sm font-medium text-muted-foreground hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> New puzzle
        </button>
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          <CheckCircle className="h-4 w-4" /> Submit Answer
        </button>
      </div>
    </form>
  );
}