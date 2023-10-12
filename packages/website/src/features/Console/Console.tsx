'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Box,
  Icon,
  Text,
  CloseButton,
  Flex,
  Fade,
  Collapse,
} from '@chakra-ui/react';
import { useLogs } from '@/providers/logsProvider';
import { format } from 'date-fns';

export const Console = () => {
  //const isMobile = useBreakpointValue([true, true, false]);
  const [isOpen, setIsOpen] = useState(false);
  const { logs } = useLogs();

  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) {
      (boxRef.current as any).scrollTop = (boxRef.current as any).scrollHeight; // Scroll the content of the box to the bottom
    }
  }, [boxRef.current]);

  return (
    <Flex
      position="fixed"
      bottom="48px"
      right="48px"
      flexDirection="column"
      alignItems="flex-end"
    >
      <Flex
        position="absolute"
        bottom="0"
        right="0"
        flexDirection="column"
        alignItems="flex-end"
      >
        <Fade in={isOpen}>
          <CloseButton
            opacity={0.6}
            _hover={{ opacity: 0.8 }}
            onClick={() => {
              setIsOpen(false);
            }}
          />
        </Fade>

        <Box
          borderColor={'gray.600'}
          borderWidth="2px"
          borderRadius="md"
          overflow="hidden"
        >
          <Fade in={!isOpen}>
            <Button
              onClick={() => {
                setIsOpen(!isOpen);
              }}
              variant="outline"
              background={'gray.700'}
              aria-label="Settings"
              borderColor={'gray.600'}
              borderWidth="2px"
              borderRadius="md"
              height="52px"
              width="52px"
              boxShadow="lg"
              _hover={{
                background: 'gray.600',
                borderColor: 'teal.500',
              }}
              position="absolute"
              display="block"
              zIndex="2"
              bottom="0"
              right="0"
              p="0"
            >
              <Icon
                m="2"
                boxSize={12}
                opacity={0.66}
                _hover={{ opacity: 1 }}
                viewBox="0 0 36 36"
              >
                <polyline
                  fill="none"
                  stroke="white"
                  points="4 17 10 11 4 5"
                ></polyline>
                <line
                  fill="none"
                  stroke="white"
                  x1="12"
                  y1="19"
                  x2="20"
                  y2="19"
                ></line>
              </Icon>
            </Button>
          </Fade>
          <Collapse startingHeight={48} in={isOpen}>
            <Box
              background="black"
              p={2}
              height={isOpen ? '345px' : '48px'}
              width={isOpen ? '570px' : '48px'}
              maxHeight={'345px'}
              overflowY={'auto'}
              overflowX={'hidden'}
              position="relative"
              display="block"
              zIndex="1"
              ref={boxRef}
            >
              {logs.map((log, i) => (
                <Text
                  key={i}
                  display="block"
                  background="black"
                  fontSize="xs"
                  fontFamily="var(--font-miriam)"
                >
                  {`[${format(log.date, 'kk:mm:ss')}] ${log.message}`}
                </Text>
              ))}
            </Box>
          </Collapse>
        </Box>
      </Flex>
    </Flex>
  );
};
