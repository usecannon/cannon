import { useState, useEffect, ReactNode } from 'react';

function ClientOnly({ children, ...delegated }: { children: ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return null;
  }
  return <div {...delegated}>{children}</div>;
}

export default ClientOnly;
