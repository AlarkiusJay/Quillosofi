import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!show || !triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;

    let x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    let y = triggerRect.top - tooltipRect.height - padding;

    // Keep within viewport
    if (x < padding) x = padding;
    if (x + tooltipRect.width > window.innerWidth - padding) {
      x = window.innerWidth - tooltipRect.width - padding;
    }

    // If top is cut off, show below
    if (y < padding) {
      y = triggerRect.bottom + padding;
    }

    setPos({ x, y });
  }, [show]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="inline-block"
      >
        {children}
      </div>

      {show &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              zIndex: 9999,
            }}
            className="bg-[#111] text-white text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none shadow-lg"
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}