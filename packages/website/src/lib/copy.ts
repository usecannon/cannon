import { toast } from 'sonner';

export const useCopy = () => {
  const copy = (textToCopy: string) => {
    toast('Copied to clipboard');

    // navigator clipboard api needs a secure context (https)
    if (navigator.clipboard && window.isSecureContext) {
      // navigator clipboard api method'
      return navigator.clipboard.writeText(textToCopy);
    } else {
      // text area method
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      // make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      return new Promise<void>((res, rej) => {
        // here the magic happens
        if (document.execCommand('copy')) {
          res();
        } else {
          rej();
        }
        textArea.remove();
      });
    }
  };
  return copy;
};
