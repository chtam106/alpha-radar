import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { Box, Fab } from '@mui/material';
import { useEffect, useState } from 'react';

const EDGE_THRESHOLD = 8;

function getMaximumScrollTop(): number {
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  return Math.max(0, documentHeight - window.innerHeight);
}

export function ScrollToEdgeButton() {
  const [scrollDirection, setScrollDirection] = useState<'down' | 'up'>('down');

  useEffect(() => {
    let previousScrollTop = window.scrollY;

    function updateScrollDirection() {
      const currentScrollTop = window.scrollY;
      const maximumScrollTop = getMaximumScrollTop();

      if (currentScrollTop <= EDGE_THRESHOLD) {
        setScrollDirection('down');
      } else if (currentScrollTop >= maximumScrollTop - EDGE_THRESHOLD) {
        setScrollDirection('up');
      } else if (currentScrollTop !== previousScrollTop) {
        setScrollDirection(currentScrollTop > previousScrollTop ? 'down' : 'up');
      }

      previousScrollTop = currentScrollTop;
    }

    updateScrollDirection();
    window.addEventListener('scroll', updateScrollDirection, { passive: true });
    window.addEventListener('resize', updateScrollDirection);

    return () => {
      window.removeEventListener('scroll', updateScrollDirection);
      window.removeEventListener('resize', updateScrollDirection);
    };
  }, []);

  function scrollToOppositeEdge() {
    window.scrollTo({
      top: scrollDirection === 'down' ? getMaximumScrollTop() : 0,
      behavior: 'smooth'
    });
  }

  return (
    <Box className="a-scroll-to-edge-button">
      <Fab
        aria-label={scrollDirection === 'up' ? 'Scroll to top' : 'Scroll to bottom'}
        className="a-scroll-to-edge-button__fab"
        color="primary"
        onClick={scrollToOppositeEdge}
        size="medium"
        title={scrollDirection === 'up' ? 'Scroll to top' : 'Scroll to bottom'}
      >
        {scrollDirection === 'up' ? (
          <KeyboardArrowUpRoundedIcon />
        ) : (
          <KeyboardArrowDownRoundedIcon />
        )}
      </Fab>
    </Box>
  );
}
