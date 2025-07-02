'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useMDXComponent } from 'next-contentlayer/hooks';
import { cn } from '@/lib/utils';
import { Callout } from '@/components/callout';
import { CodeBlockWrapper } from '@/components/code-block-wrapper';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Snippet } from '@/components/snippet';
import { FilesBlock } from '@/components/files-block';
import { Info, Link as LinkIcon } from 'lucide-react';

// Utility function to generate URL-friendly slugs from heading text
function slugify(text: string): string {
  if (typeof text !== 'string') {
    // Handle cases where children might be React elements
    return '';
  }

  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Extract text content from React children (including nested elements)
function getTextContent(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (typeof children === 'number') {
    return children.toString();
  }

  if (React.isValidElement(children)) {
    return getTextContent(children.props.children);
  }

  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }

  return '';
}

// Heading component with anchor link
function createHeadingComponent(
  tagName: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  baseClassName: string
) {
  return function HeadingComponent({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLHeadingElement>) {
    const textContent = getTextContent(children);
    const id = slugify(textContent);

    return React.createElement(
      tagName,
      {
        className: cn('group relative scroll-m-20', baseClassName, className),
        id,
        ...props,
      },
      children,
      id &&
        React.createElement(
          'a',
          {
            href: `#${id}`,
            className:
              'ml-2 inline-flex h-4 w-4 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100',
            'aria-label': `Link to ${textContent}`,
          },
          React.createElement(LinkIcon, { className: 'h-3 w-3' })
        )
    );
  };
}

const components = {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert: ({
    className,
    ...props
  }: { className?: string } & React.ComponentProps<typeof Alert>) => (
    <div className="mt-6 first:mt-0">
      <Alert className={className} {...props} />
    </div>
  ),
  AlertTitle,
  AlertDescription,
  Info,
  h1: createHeadingComponent(
    'h1',
    'mt-8 text-4xl font-extrabold tracking-tight lg:text-5xl'
  ),
  h2: createHeadingComponent(
    'h2',
    'mt-8 text-3xl font-semibold tracking-tight first:mt-0'
  ),
  h3: createHeadingComponent(
    'h3',
    'mt-8 border-b border-border pb-3 text-2xl font-semibold tracking-tight'
  ),
  h4: createHeadingComponent(
    'h4',
    'mt-8 border-b border-border pb-3 text-xl font-semibold tracking-tight'
  ),
  h5: createHeadingComponent('h5', 'mt-8 text-lg font-semibold tracking-tight'),
  h6: createHeadingComponent(
    'h6',
    'mt-8 text-base font-semibold tracking-tight'
  ),
  a: ({ className, ...props }: React.HTMLAttributes<HTMLAnchorElement>) => (
    <a
      className={cn('font-medium underline underline-offset-4', className)}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={cn('leading-7 [&:not(:first-child)]:mt-6', className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className={cn('my-6 ml-6 list-disc', className)} {...props} />
  ),
  ol: ({ className, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className={cn('my-6 ml-6 list-decimal', className)} {...props} />
  ),
  li: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <li className={cn('mt-2', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
    <blockquote
      className={cn('mt-6 border-l-2 pl-6 italic', className)}
      {...props}
    />
  ),
  img: ({
    className,
    alt,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={cn('rounded-md', className)} alt={alt} {...props} />
  ),
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-4 md:my-8" {...props} />
  ),
  Table: ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-6 w-full overflow-y-auto">
      <table
        className={cn(
          'relative w-full overflow-hidden border-none text-sm',
          className
        )}
        {...props}
      />
    </div>
  ),
  Tr: ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr
      className={cn('last:border-b-none m-0 border-b border-border', className)}
      {...props}
    />
  ),
  Th: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className={cn(
        'px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  Td: ({ className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className={cn(
        'px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right',
        className
      )}
      {...props}
    />
  ),
  pre: Snippet,
  code: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="relative rounded bg-muted text-red-500 px-[0.3rem] py-[0.2rem] font-mono text-sm"
      {...props}
    />
  ),
  Image,
  Callout,
  AspectRatio,
  CodeBlockWrapper: ({ ...props }) => (
    <CodeBlockWrapper className="rounded-md border" {...props} />
  ),
  Step: ({ className, ...props }: React.ComponentProps<'h3'>) => (
    <h3
      className={cn(
        'font-heading mt-8 scroll-m-20 text-xl font-semibold tracking-tight',
        className
      )}
      {...props}
    />
  ),
  Steps: ({ ...props }) => (
    <div
      className="[&>h3]:step steps mb-12 ml-4 border-l pl-8 [counter-reset:step]"
      {...props}
    />
  ),
  Tabs: ({ className, ...props }: React.ComponentProps<typeof Tabs>) => (
    <div className="mt-6">
      <Tabs className={className} {...props} />
    </div>
  ),
  TabsList: ({
    className,
    ...props
  }: React.ComponentProps<typeof TabsList>) => (
    <TabsList className={className} {...props} />
  ),
  TabsTrigger: ({
    className,
    ...props
  }: React.ComponentProps<typeof TabsTrigger>) => (
    <TabsTrigger className={className} {...props} />
  ),
  TabsContent: ({
    className,
    ...props
  }: React.ComponentProps<typeof TabsContent>) => (
    <div className="pt-1">
      <TabsContent className={className} {...props} />
    </div>
  ),
  Link: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn('font-medium underline underline-offset-4', className)}
      {...props}
    />
  ),
  LinkedCard: ({ className, ...props }: React.ComponentProps<typeof Link>) => (
    <Link
      className={cn(
        'flex w-full flex-col items-center rounded-xl border bg-card p-6 text-card-foreground shadow transition-colors hover:bg-muted/50 sm:p-10',
        className
      )}
      {...props}
    />
  ),
  FilesBlock,
};

interface MdxProps {
  code: string;
}

export function Mdx({ code }: MdxProps) {
  const Component = useMDXComponent(code, {
    style: {
      name: 'default',
      label: 'Default',
    },
  });

  return (
    <div className="mdx">
      <Component components={components} />
    </div>
  );
}
