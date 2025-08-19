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
            <div className="relative flex items-center justify-center w-[235px] h-[235px] mx-auto">
              <QRCodeCanvas
                value={text}
                size={235}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />
              <div className="absolute w-12 h-12 rounded-full bg-black flex items-center justify-center shadow-md p-2">
                <img
                  src="/images/logomark.svg"
                  alt="logo"
                  className="w-10 h-10"
                />
              </div>
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
