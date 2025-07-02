import Link from 'next/link';

export default function Custom404({
  text = 'Page not found',
}: {
  text?: string;
}) {
  return (
    <div className="flex w-full">
      <p className="m-auto font-miriam uppercase tracking-wider text-center">
        {text}
        <br />
        <br />
        <Link className="text-blue-500 underline" href="/">
          Go Home
        </Link>
      </p>
    </div>
  );
}
