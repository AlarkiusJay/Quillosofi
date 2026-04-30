import { useState, useEffect, useRef } from 'react';

export default function useTypewriter(text, speed = 8) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  useEffect(() => {
    if (!text) return;
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);

    const tick = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      const charsToAdd = Math.max(1, Math.floor(elapsed / speed));

      if (indexRef.current < text.length) {
        indexRef.current = Math.min(indexRef.current + charsToAdd, text.length);
        setDisplayed(text.slice(0, indexRef.current));
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayed(text);
        setDone(true);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [text]);

  return { displayed, done };
}