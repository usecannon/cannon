import {
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { FoundrySetupPanel } from './FoundryGuide/FoundrySetupPanel';
import { HardhatSetupPanel } from './HardhatGuide/HardhatSetupPanel';

export const SetupPanel = () => {
  return (
    <>
      <Text
        color="gray.200"
        textDecoration="none"
        textTransform={'uppercase'}
        letterSpacing={'1px'}
        fontFamily={'var(--font-miriam)'}
        textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
        mb={2.5}
      >
        Select your framework
      </Text>
      <Tabs variant="solid-rounded" colorScheme="gray">
        <TabList>
          <Tab mr={3} border="1px solid rgba(255,255,255,0.1)">
            Foundry
          </Tab>
          <Tab border="1px solid rgba(255,255,255,0.1)">Hardhat</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            <FoundrySetupPanel />
          </TabPanel>
          <TabPanel px={0}>
            <HardhatSetupPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
};
