'use client';
import {useDocumentInfo} from '@payloadcms/ui';
import {useState} from 'react';

export function ReprocessMedia() {
  const {id} = useDocumentInfo();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!id) return null;
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          void (async () => {
            setBusy(true);
            try {
              const response = await fetch(`/api/media/${id}/reprocess`, {
                method: 'POST',
                credentials: 'same-origin',
              });
              setMessage(
                response.ok
                  ? 'Processing queued. Reload to see the latest status.'
                  : 'Could not queue processing.',
              );
            } catch {
              setMessage('Could not queue processing.');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        Reprocess media
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
