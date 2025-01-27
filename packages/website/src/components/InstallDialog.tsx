'use client';

import { Share, PlusSquare } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const InstallDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if we're on mobile and not in standalone mode
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia(
      '(display-mode: standalone)'
    ).matches;

    if (isMobile && !isStandalone) {
      setIsOpen(true);
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-[90%] sm:max-w-[425px] mx-auto"
        autoFocus={false}
      >
        <div className="mx-auto w-full max-w-sm">
          <DialogHeader className="mb-6">
            <div className="my-4 flex justify-center">
              <Image
                src="images/icons/icon-144x144.png"
                alt="Foil App Icon"
                width={72}
                height={72}
                className="rounded-2xl border border-border shadow-lg"
              />
            </div>
            <DialogTitle className="text-center text-2xl">
              Install Cannon
            </DialogTitle>
            <DialogDescription className="max-w-[260px] mx-auto text-xs">
              Add the Cannon app to your home screen for{' '}
              <strong>one tap to the latest protocol upgrades</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 rounded-lg bg-muted px-4 py-6 text-center">
            <div className="space-y-2">
              <p>
                Tap the{' '}
                <span className="mx-0.5 inline-flex translate-y-[3px] items-center">
                  <Share className="h-5 w-5" />
                </span>{' '}
                icon in your browser
              </p>
            </div>
            <div className="space-y-2">
              <p>
                Select{' '}
                <span className="mx-0.5 inline-flex translate-y-[3px] items-center">
                  <PlusSquare className="h-5 w-5" />
                </span>{' '}
                Add to Home Screen
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallDialog;
