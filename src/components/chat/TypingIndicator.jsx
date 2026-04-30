import { useEffect, useState } from 'react';

export default function TypingIndicator({ modelLabel }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    setSeconds(0);
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Friendly status text — gives the user a sense of progress so the wait
  // doesn't feel dead-still.
  let status = 'Thinking…';
  if (seconds > 25) status = 'Still working — long answers can take a bit.';
  else if (seconds > 12) status = 'Composing a thoughtful reply…';
  else if (seconds > 4) status = 'Thinking it through…';

  return (
    <div className="flex items-start gap-4 px-4 py-1 animate-fade-in">
      <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-0.5 bg-[hsl(235,50%,30%)]">
        <img src="https://media.base44.com/images/public/69cec1d94563b236c10d8de7/cf53c7132_QuillosofiICO.svg" alt="Quillosofi" className="h-full w-full object-contain p-0.5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-white mb-1">Quillosofi</p>
        <div className="flex gap-2 items-center h-5">
          <div className="flex gap-1.5 items-center">
            <div className="w-2 h-2 rounded-full bg-[hsl(220,7%,55%)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[hsl(220,7%,55%)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[hsl(220,7%,55%)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-[hsl(220,7%,55%)]">
            {status}
            {seconds >= 3 && (
              <span className="ml-2 font-mono text-[hsl(220,7%,45%)]">{seconds}s</span>
            )}
            {modelLabel && (
              <span className="ml-2 text-[hsl(220,7%,45%)]">· {modelLabel}</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
