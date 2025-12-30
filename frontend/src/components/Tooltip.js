import React, { useState } from 'react';
import './Tooltip.css';

const Tooltip = ({ text, children, position = 'top' }) => {
  const [show, setShow] = useState(false);

  if (!text) {
    return children;
  }

  const tooltipClass = position === 'bottom' ? 'tooltip tooltip-bottom' : 'tooltip';

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={tooltipClass}>
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;

