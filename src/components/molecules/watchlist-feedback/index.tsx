import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { Alert, Dialog, DialogContent, Snackbar } from '@mui/material';
import { useEffect } from 'react';
const CONFIRMATION_DURATION = 600;

export function WatchlistFeedback({
  feedback,
  onClose,
  context = 'watchlist'
}: {
  feedback: 'added' | 'removed' | 'hidden' | 'unhidden' | 'cleared' | 'error' | null;
  onClose: () => void;
  context?: 'watchlist' | 'home';
}) {
  const confirmed =
    feedback === 'added' ||
    feedback === 'removed' ||
    feedback === 'hidden' ||
    feedback === 'unhidden' ||
    feedback === 'cleared';
  const confirmationLabel =
    feedback === 'hidden'
      ? 'Hidden from Home'
      : feedback === 'unhidden'
        ? 'Restored to Home'
        : feedback === 'cleared'
          ? context === 'watchlist'
            ? 'Watchlist cleared'
            : 'All coins restored to Home'
          : feedback === 'added'
            ? 'Added to watchlist'
            : 'Removed from watchlist';

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
              'aria-label': confirmationLabel,
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
          {context === 'watchlist'
            ? 'Unable to save the watchlist. Please try again.'
            : 'Unable to update hidden coins. Please try again.'}
        </Alert>
      </Snackbar>
    </>
  );
}
