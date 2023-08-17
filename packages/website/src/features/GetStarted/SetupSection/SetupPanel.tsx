import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import React from 'react';
import { FoundrySetupPanel } from './FoundryGuide/FoundrySetupPanel';
import { HardhatSetupPanel } from './HardhatGuide/HardhatSetupPanel';

export const SetupPanel = () => {
  return (
    <Tabs>
      <TabList>
        <Tab>Foundry</Tab>
        <Tab>Hardhat</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <FoundrySetupPanel />
        </TabPanel>
        <TabPanel>
          <HardhatSetupPanel />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
