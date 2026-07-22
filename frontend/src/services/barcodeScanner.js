/**
 * Universal Hardware Barcode Scanner Listener Service
 * Listens for high-speed keypress events typical of standard USB/Bluetooth Barcode Guns
 */

export function setupBarcodeScanner(onScan, options = {}) {
  const { minLength = 3, maxInterval = 50 } = options;
  let buffer = '';
  let lastKeyTime = Date.now();

  function handleKeyDown(event) {
    const currentTime = Date.now();

    // Ignore keypresses inside regular form inputs if required
    const targetTag = event.target ? event.target.tagName.toLowerCase() : '';
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      if (event.target.id !== 'barcode-scanner-input') {
        // Allow standard typing if user is editing a form field
        return;
      }
    }

    if (currentTime - lastKeyTime > maxInterval) {
      buffer = '';
    }

    if (event.key === 'Enter') {
      if (buffer.length >= minLength) {
        event.preventDefault();
        onScan(buffer.trim());
        buffer = '';
      }
    } else if (event.key.length === 1) {
      buffer += event.key;
    }

    lastKeyTime = currentTime;
  }

  window.addEventListener('keydown', handleKeyDown);

  return function cleanup() {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
