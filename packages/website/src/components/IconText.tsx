import { FC, ComponentType } from 'react';
import { FlexProps, IconProps } from '@chakra-ui/react';
import { Flex } from '@chakra-ui/react';

interface IconLinkProps extends FlexProps {
  icon: ComponentType<IconProps>;
  label: string;
  iconProps?: IconProps;
}

const IconText: FC<IconLinkProps> = ({
  icon: IconComponent,
  label,
  iconProps,
  ...flexProps
}) => {
  return (
    <Flex alignItems="center" {...flexProps}>
      <IconComponent
        boxSize={4}
        mr={1.5}
        transform="translateY(-0.5px)"
        {...iconProps}
      />
      {label}
    </Flex>
  );
};

export default IconText;
