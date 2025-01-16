import { CodePreview } from '@/components/CodePreview';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import React, { useEffect, useState } from 'react';
import { stringify } from '@iarna/toml';
import { useStepModalContext } from '@/providers/stepModalProvider';

interface Props {
  name: string;
  modules: Record<string, object>;
}

const ChainDefinitionSteps: React.FC<Props> = ({ name, modules }) => {
  const [open, setOpen] = useState(false);
  const { activeModule, setActiveModule } = useStepModalContext();
  const [activeModuleData, setActiveModuleData] = useState<Record<
    string,
    object
  > | null>(null);

  useEffect(() => {
    if (name === activeModule?.split('.')[0]) {
      const moduleName = activeModule.split('.')[1];
      if (modules[moduleName]) {
        setActiveModuleData({ [activeModule]: modules[moduleName] });
        setOpen(true);
      }
    }
  }, [activeModule, modules, name]);

  return (
    <div>
      {Object.keys(modules).map((key) => (
        <Button
          size="xs"
          variant="outline"
          className="font-mono mr-2 mb-2 text-xs hover:bg-accent"
          key={key}
          onClick={() => {
            setActiveModule(`${name}.${key}`);
          }}
        >
          [{name}.{key}]
        </Button>
      ))}

      {activeModuleData && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-4xl bg-transparent border-none p-0">
            <div className="relative my-12">
              <CodePreview
                height="66vh"
                code={stringify({ ...activeModuleData } as any)}
                language="ini"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ChainDefinitionSteps;
