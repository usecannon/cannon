export default function Custom404({
  text = 'Page not found',
}: {
  text?: string;
}) {
  return (
    <div className="flex w-full">
      <p className="m-auto font-miriam uppercase tracking-wider">{text}</p>
    </div>
  );
}
