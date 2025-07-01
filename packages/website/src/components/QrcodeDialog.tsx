import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

type QrcodeDialogProps = {
  text: string;
};

const QrcodeDialog: React.FC<QrcodeDialogProps> = ({ text }) => {
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
          <DialogContent className="max-w-[300px] w-full px-2 py-4">
            <DialogHeader>
              <DialogTitle className="font-bold px-2">
                Address QR code
              </DialogTitle>
              <DialogDescription className="sr-only">
                Address QR code
              </DialogDescription>
            </DialogHeader>
            <hr className="w-full" />
            <div className="flex items-center justify-center">
              <QRCodeCanvas
                value={text}
                size={235}
                bgColor="#000000"
                fgColor="#ffffff"
                level="H"
              />
            </div>
            <div className="mt-4 text-center w-full break-words">
              <span className="text-sm text-muted-foreground break-all">
                {text}
              </span>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
};

export default QrcodeDialog;
