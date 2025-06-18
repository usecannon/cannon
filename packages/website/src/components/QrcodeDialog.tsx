import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';

const QrcodeDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="flex-shrink-0 h-7 w-7 bg-background border border-border"
        data-testid="clipboard-copy-button"
        onClick={() => setIsOpen(true)}
      >
        <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/80" />
          <DialogContent className="">
            <DialogHeader>
              <DialogTitle>SAddress QR code</DialogTitle>
            </DialogHeader>
            <div className="text-gray-200 border border-gray-400 p-4 rounded-md">
              QR Code Shows up!
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
};

export default QrcodeDialog;
