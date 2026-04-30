import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-4 px-4 py-1 animate-fade-in">
      <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 mt-0.5 bg-[hsl(235,50%,30%)]">
        <img src="https://media.base44.com/images/public/69cec1d94563b236c10d8de7/cf53c7132_QuillosofiICO.svg" alt="Quillosofi" className="h-full w-full object-contain p-0.5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-white mb-1">Quillosofi</p>
        <div className="flex gap-1.5 items-center h-5">
          <div className="w-2 h-2 rounded-full bg-[hsl(220,7%,55%)] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[hsl(220,7%,55%)] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[hsl(220,7%,55%)] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}