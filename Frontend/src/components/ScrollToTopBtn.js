import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

function ScrollToTopBtn() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <div className={`scroll-top-btn ${isVisible ? 'visible' : ''}`} onClick={scrollToTop}>
      <ArrowUp size={24} />
    </div>
  );
}

export default ScrollToTopBtn;
