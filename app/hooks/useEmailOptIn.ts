import { useState, useEffect, useCallback } from 'react';
import type { Session } from 'next-auth';

export function useEmailOptIn(session: Session | null) {
  const [emailOptIn, setEmailOptIn] = useState<boolean | null>(null);
  const [emailOptInChoice, setEmailOptInChoice] = useState<'yes' | 'no' | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    const loadEmailStatus = async () => {
      try {
        const res = await fetch('/api/email');
        if (res.ok) {
          const data = await res.json();
          setEmailOptIn(data.optedIn ?? false);
          setEmailOptInChoice(data.optedIn ? 'yes' : 'no');
        }
      } catch (err) {
        console.error('Failed to load email status:', err);
      }
    };
    loadEmailStatus();
  }, [session?.user]);

  const saveEmailPreference = useCallback(async () => {
    if (emailOptInChoice === null) return;
    setEmailSaving(true);
    setEmailStatus(null);
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optIn: emailOptInChoice === 'yes' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus(data.error || 'Something went wrong');
      } else if (data.emailSent) {
        setEmailOptIn(true);
        setEmailStatus('Subscribed! Check your inbox for tomorrow\'s meal plan.');
      } else {
        setEmailOptIn(false);
        setEmailStatus('Preference saved. You will not receive emails.');
      }
    } catch (err) {
      setEmailStatus('Failed to save preference');
      console.error(err);
    } finally {
      setEmailSaving(false);
    }
  }, [emailOptInChoice]);

  return {
    emailOptIn,
    emailOptInChoice,
    setEmailOptInChoice,
    emailSaving,
    emailStatus,
    saveEmailPreference,
  };
}
