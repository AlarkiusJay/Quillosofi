import { useState } from 'react';
import { app } from '@/api/localClient';
import PuzzleChallenge from '../onboarding/PuzzleChallenge';
import PinDisplay from '../onboarding/PinDisplay';

function generatePin() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pin = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) pin += '-';
    pin += chars[Math.floor(Math.random() * chars.length)];
  }
  return pin;
}

export default function PuzzleTokenSetup({ onComplete }) {
  const [step, setStep] = useState('puzzle');
  const [pin, setPin] = useState('');

  const handleSolved = async () => {
    const newPin = generatePin();
    setPin(newPin);
    await app.auth.updateMe({ nexal_pin: newPin, pin_setup_complete: true });
    setStep('pin');
  };

  const handleConfirmed = () => {
    onComplete?.();
  };

  return (
    <div className="space-y-4">
      {step === 'puzzle' && (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">Solve this quick challenge to generate your unique access token.</p>
          </div>
          <PuzzleChallenge onSolved={handleSolved} />
        </>
      )}
      {step === 'pin' && (
        <>
          <div className="text-center mb-4">
            <p className="text-sm text-muted-foreground">This is the key to your Nexal account. Guard it well.</p>
          </div>
          <PinDisplay pin={pin} onConfirmed={handleConfirmed} />
        </>
      )}
    </div>
  );
}