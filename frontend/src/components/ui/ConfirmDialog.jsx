import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isLoading = false
}) {
  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      maxWidth="max-w-sm"
    >
      <p className="text-sm text-slate-600 dark:text-[#9CA3AF] leading-relaxed">{message}</p>
      <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-200 dark:border-[#2D3138]">
        <Button type="button" variant="ghost" onClick={onClose} isDisabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={buttonVariant}
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
