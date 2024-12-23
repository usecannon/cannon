import Link from 'next/link';
import { type Guides } from 'contentlayer/generated';
import {
  Card,
  CardTitle,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { ArrowRightIcon, ArrowLeftIcon } from '@radix-ui/react-icons';
import { cn } from '@/lib/utils';

export const NavDocsCard = ({
  title,
  description,
  type,
  href,
  className,
}: {
  title: string;
  type: 'next' | 'prev';
  description: string;
  href: string;
  className: string;
}) => {
  const icon = {
    next: <ArrowRightIcon className="text-teal-500 size-4 mb-8" />,
    prev: <ArrowLeftIcon className="text-teal-500 size-4 mb-8" />,
  };
  return (
    <Link className={className} href={href}>
      <Card
        className={cn(
          'hover:border-px hover:border-teal-500 hover:bg-teal-500/10',
          'h-full'
        )}
      >
        <CardHeader
          className={cn(
            'flex h-full',
            type === 'next' ? 'items-end text-right' : 'items-start text-left'
          )}
        >
          {icon[type]}
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
};

export const DocsNav = ({ guide }: { guide: Guides }) => (
  <div className="grid grid-cols-12 gap-x-5 mt-20">
    {guide.before && (
      <NavDocsCard
        type="prev"
        className="col-span-6 col-start-1"
        title={guide.before.title}
        description={guide.before.description}
        href={`/learn/guides/get-started/${guide.before.url}`}
      />
    )}
    {guide.after && (
      <NavDocsCard
        type="next"
        className="col-span-6 col-start-7"
        title={guide.after.title}
        description={guide.after.description}
        href={`/learn/guides/get-started/${guide.after.url}`}
      />
    )}
  </div>
);
