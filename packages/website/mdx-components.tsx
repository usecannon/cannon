import type { MDXComponents } from 'mdx/types';

// Here we can add custom components to the MDXProvider
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ children }) => (
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="scroll-m-20 border-b border-white/40 text-2xl font-semibold tracking-tight">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="scroll-m-20 border-b border-white/40 text-xl font-semibold tracking-tight">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="leading-7 [&:not(:first-child)]:mt-6">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mt-6 border-l-2 pl-6 italic">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="px-2 py-1 relative rounded bg-neutral-900 text-red-500 font-mono text-sm">
        {children}
      </code>
    ),
    a: ({ children, ...props }) => {
      return (
        <a
          href={props.href}
          target="_blank"
          className="text-teal-400 hover:underline hover:cursor-pointer"
        >
          {children}
        </a>
      );
    },
  };
}
