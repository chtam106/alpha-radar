import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Alert, Dialog, DialogContent, Snackbar } from '@mui/material';
import { useEffect } from 'react';
import type { WatchlistFeedback as WatchlistFeedbackState } from '@/hooks/use-watchlist';

const CONFIRMATION_DURATION = 600;

export function WatchlistFeedback({
  feedback,
  onClose
}: {
  feedback: WatchlistFeedbackState;
  onClose: () => void;
}) {
  const confirmed = feedback === 'added' || feedback === 'removed';

  useEffect(() => {
    if (!confirmed) return;
    const timer = window.setTimeout(onClose, CONFIRMATION_DURATION);
    return () => window.clearTimeout(timer);
  }, [confirmed, feedback, onClose]);

  return (
    <>
      {confirmed && (
        <Dialog
          open
          slotProps={{
            paper: {
              'aria-label': feedback === 'added' ? 'Added to watchlist' : 'Removed from watchlist',
              'aria-labelledby': undefined
            }
          }}
        >
          <DialogContent className="m-watchlist-feedback__content">
            <CheckCircleRoundedIcon className="m-watchlist-feedback__icon" aria-hidden="true" />
          </DialogContent>
        </Dialog>
      )}
      <Snackbar open={feedback === 'error'} autoHideDuration={6000} onClose={onClose}>
        <Alert severity="error" onClose={onClose}>
          Unable to save the watchlist. Please try again.
        </Alert>
      </Snackbar>
    </>
  );
}
