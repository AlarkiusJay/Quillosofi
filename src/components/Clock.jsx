import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function Clock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-3 right-3 z-50 text-[11px] font-mono text-[hsl(220,7%,45%)] select-none pointer-events-none">
      {format(now, 'EEE dd MMM · HH:mm:ss')}
    </div>
  );
}