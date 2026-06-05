const clickOutsideBoundElements = new WeakSet<Element>();

/**
 * Setup a document-level click listener to track outside clicks for the element.
 */
export function setupClickOutsideListener(element: Element) {
  if (clickOutsideBoundElements.has(element)) return;
  clickOutsideBoundElements.add(element);

  const onDocumentClick = (e: Event) => {
    // If the element is no longer in the document, clean up the global listener
    if (!element.isConnected) {
      document.removeEventListener('click', onDocumentClick, { capture: true });
      clickOutsideBoundElements.delete(element);
      return;
    }

    const target = e.target as Node;
    if (target && !element.contains(target)) {
      const customEvent = new CustomEvent('clickoutside', {
        bubbles: false,
        cancelable: true,
        detail: e,
      });
      element.dispatchEvent(customEvent);
    }
  };

  document.addEventListener('click', onDocumentClick, { capture: true });
}

// Monkey-patch EventTarget to setup click outside tracking when 'clickoutside' events are bound
if (typeof EventTarget !== 'undefined') {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    if (type === 'clickoutside' && this instanceof Element) {
      setupClickOutsideListener(this);
    }
    return originalAddEventListener.call(this, type, listener as any, options);
  };
}
