import { FC, PropsWithChildren } from 'react';
import {
  Accordion as AccordionRoot,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const CustomAccordion: FC<
  PropsWithChildren & { className?: string }
> = ({ children, className }) => {
  return (
    <AccordionRoot
      type="single"
      collapsible
      className={`my-6 ${className ?? ''}`}
    >
      {children}
    </AccordionRoot>
  );
};

export const CustomAccordionItem: FC<
  PropsWithChildren & {
    className?: string;
    contentClassName?: string;
    title: string;
  }
> = ({ title, children, className, contentClassName }) => {
  return (
    <AccordionItem
      value={title}
      className={`border-l border-r first:border-t border-dotted border-gray-500 px-4 ${
        className ?? ''
      }`}
    >
      <AccordionTrigger className="hover:no-underline">
        <span className="flex-1 text-left">
          <span className="text-gray-200 uppercase tracking-wider font-miriam text-lg">
            {title}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className={contentClassName}>
        {children}
      </AccordionContent>
    </AccordionItem>
  );
};
