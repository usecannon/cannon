import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FoundrySetupPanel } from './FoundryGuide/FoundrySetupPanel';
import { HardhatSetupPanel } from './HardhatGuide/HardhatSetupPanel';

export const SetupPanel = () => {
  return (
    <>
      <p
        className="text-gray-200 uppercase tracking-[1px] font-miriam mb-2.5
        text-shadow-[0px_0px_4px_rgba(255,255,255,0.33)]"
      >
        Select your framework
      </p>
      <Tabs defaultValue="foundry" className="w-full">
        <TabsList className="gap-3">
          <TabsTrigger value="foundry" className="border border-white/10">
            Foundry
          </TabsTrigger>
          <TabsTrigger value="hardhat" className="border border-white/10">
            Hardhat
          </TabsTrigger>
        </TabsList>
        <TabsContent value="foundry" className="px-0">
          <FoundrySetupPanel />
        </TabsContent>
        <TabsContent value="hardhat" className="px-0">
          <HardhatSetupPanel />
        </TabsContent>
      </Tabs>
    </>
  );
};
