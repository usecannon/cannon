import {
  Accordion as AccordionChakra,
  AccordionProps,
  AccordionButton,
  AccordionIcon,
  AccordionItem as AccordionItemChakra,
  AccordionItemProps,
  AccordionPanel,
  AccordionPanelProps,
  Box,
  Text,
} from '@chakra-ui/react';
import { FC, PropsWithChildren } from 'react';

export const CustomAccordion: FC<PropsWithChildren & AccordionProps> = ({
  children,
  ...rest
}) => {
  return (
    <AccordionChakra allowToggle mt={6} mb={4} {...rest}>
      {children}
    </AccordionChakra>
  );
};

export const CustomAccordionItem: FC<
  PropsWithChildren & {
    itemProps?: AccordionItemProps;
    accordionPanelProps: AccordionPanelProps;
    title: string;
  }
> = ({ title, children, itemProps, accordionPanelProps }) => {
  return (
    <AccordionItemChakra
      borderLeft="1px"
      borderRight="1px"
      borderColor="gray.500"
      borderStyle="dotted"
      {...itemProps}
    >
      <h2>
        <AccordionButton>
          <Box as="span" flex="1" textAlign="left">
            <Text
              color="gray.200"
              textDecoration="none"
              textTransform={'uppercase'}
              letterSpacing={'1px'}
              fontFamily={'var(--font-miriam)'}
              textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
            >
              {title}
            </Text>
          </Box>
          <AccordionIcon />
        </AccordionButton>
      </h2>
      <AccordionPanel {...accordionPanelProps}>{children}</AccordionPanel>
    </AccordionItemChakra>
  );
};
