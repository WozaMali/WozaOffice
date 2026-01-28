"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

interface DeleteTransactionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  transactionCount: number;
  isDangerous?: boolean;
  requireConfirmation?: boolean;
  confirmationText?: string;
}

export function DeleteTransactionsDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  transactionCount,
  isDangerous = false,
  requireConfirmation = false,
  confirmationText = "DELETE"
}: DeleteTransactionsDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (requireConfirmation && confirmationInput !== confirmationText) {
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setConfirmationInput('');
      onClose();
    }
  };

  const isConfirmationValid = !requireConfirmation || confirmationInput === confirmationText;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDangerous ? (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Count */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-900">
              Transactions to be deleted: <span className="font-bold">{transactionCount}</span>
            </div>
          </div>

          {/* Warning for dangerous operations */}
          {isDangerous && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. All selected transactions will be permanently deleted from the database.
              </AlertDescription>
            </Alert>
          )}

          {/* Confirmation input for dangerous operations */}
          {requireConfirmation && (
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type "{confirmationText}" to confirm deletion:
              </Label>
              <Input
                id="confirmation"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={confirmationText}
                className={!isConfirmationValid && confirmationInput ? 'border-red-500' : ''}
              />
              {!isConfirmationValid && confirmationInput && (
                <p className="text-sm text-red-600">
                  Please type "{confirmationText}" exactly to confirm
                </p>
              )}
            </div>
          )}

          {/* Success message */}
          {isDeleting && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Deleting transactions...
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant={isDangerous ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isDeleting || !isConfirmationValid}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete {transactionCount > 1 ? 'Transactions' : 'Transaction'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
