'use client';

import { useEffect, useId, useRef } from 'react';

export default function Modal({ title, eyebrow, onClose, wide = false, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={ref} className={wide ? 'wide-dialog' : ''} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="modal-heading"><div><div className="eyebrow">{eyebrow}</div><h2 id={titleId}>{title}</h2></div>
      <button type="button" className="close" onClick={onClose} aria-label="Close dialog">×</button>
    </div>
    {children}
  </dialog>;
}
