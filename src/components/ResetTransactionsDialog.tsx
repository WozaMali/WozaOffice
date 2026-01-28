"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, RotateCcw, CheckCircle } from 'lucide-react';
import { resetCollectionTransactions, getCollectionTransactionStatus } from '@/lib/resetTransactionsService';

interface ResetTransactionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collectionId: string;
  collectionName: string;
  onSuccess: () => void;
}

export function ResetTransactionsDialog({
  isOpen,
  onClose,
  collectionId,
  collectionName,
  onSuccess
}: ResetTransactionsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<any>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check transaction status when dialog opens
  useState(() => {
    if (isOpen && collectionId) {
      checkTransactionStatus();
    }
  });

  const checkTransactionStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const status = await getCollectionTransactionStatus(collectionId);
      setTransactionStatus(status);
    } catch (error) {
      console.error('Error checking transaction status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const result = await resetCollectionTransactions(collectionId);
      setResult(result);
      
      if (result.success) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An unexpected error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setResult(null);
      setTransactionStatus(null);
      onClose();
    }
  };

  const hasTransactions = transactionStatus && (
    transactionStatus.hasWalletTransactions || 
    transactionStatus.hasTransactions || 
    transactionStatus.hasQueueEntries
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Reset Collection Transactions
          </DialogTitle>
          <DialogDescription>
            Reset transactions for: <strong>{collectionName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Status */}
          {isCheckingStatus ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking transaction status...
            </div>
          ) : transactionStatus ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Transaction Status:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Wallet Transactions:</span>
                  <Badge variant={transactionStatus.hasWalletTransactions ? "destructive" : "secondary"}>
                    {transactionStatus.walletTransactionCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Regular Transactions:</span>
                  <Badge variant={transactionStatus.hasTransactions ? "destructive" : "secondary"}>
                    {transactionStatus.transactionCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Queue Entries:</span>
                  <Badge variant={transactionStatus.hasQueueEntries ? "destructive" : "secondary"}>
                    {transactionStatus.queueEntryCount}
                  </Badge>
                </div>
              </div>
            </div>
          ) : null}

          {/* Warning */}
          {hasTransactions && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Warning:</strong> This collection has existing transactions. 
                Resetting will delete all related wallet transactions, regular transactions, 
                and queue entries. The collection status will be changed back to "pending".
              </AlertDescription>
            </Alert>
          )}

          {/* No Transactions */}
          {transactionStatus && !hasTransactions && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                This collection has no existing transactions to reset.
              </AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {result && (
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isLoading || !hasTransactions}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Reset Transactions
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
