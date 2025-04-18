import { FC } from 'react';
import { AbiFunction } from 'abitype';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import SearchInput from '@/components/SearchInput';

interface AbiSidebarProps {
  readContractMethods: AbiFunction[];
  writeContractMethods: AbiFunction[];
  searchTerm: string;
  selectedSelector: string | null;
  onSearchChange: (term: string) => void;
  onMethodClick: (func: AbiFunction) => void;
  getSelectorSlug: (f: AbiFunction) => string;
}

export const AbiSidebar: FC<AbiSidebarProps> = ({
  readContractMethods,
  writeContractMethods,
  searchTerm,
  selectedSelector,
  onSearchChange,
  onMethodClick,
  getSelectorSlug,
}) => {
  return (
    <SidebarContent className="overflow-y-auto">
      <SidebarGroup className="pb-1 px-3">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem className="mt-1">
              <SearchInput size="sm" onSearchChange={onSearchChange} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="pt-0">
        <SidebarGroupContent>
          <SidebarGroupLabel className="h-6">Read Functions</SidebarGroupLabel>
        </SidebarGroupContent>

        <SidebarGroupContent>
          <SidebarMenu className="gap-0">
            {readContractMethods
              ?.filter((f) =>
                f.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((f, index) => (
                <SidebarMenuButton
                  className="overflow-hidden text-ellipsis whitespace-nowrap block w-full font-mono text-sm py-0"
                  key={index}
                  isActive={selectedSelector == getSelectorSlug(f)}
                  onClick={() => onMethodClick(f)}
                  data-testid={`${f.name}-button`}
                >
                  {f.name}(
                  {f.inputs
                    .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                    .join(',')}
                  )
                </SidebarMenuButton>
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="pt-0">
        <SidebarGroupLabel className="h-6">Write Functions</SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu className="gap-0">
            {writeContractMethods
              ?.filter((f) =>
                f.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((f, index) => (
                <SidebarMenuButton
                  className="overflow-hidden text-ellipsis whitespace-nowrap block w-full font-mono text-sm py-0"
                  key={index}
                  isActive={selectedSelector == getSelectorSlug(f)}
                  onClick={() => onMethodClick(f)}
                  data-testid={`${f.name}-button`}
                >
                  {f.name}(
                  {f.inputs
                    .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                    .join(',')}
                  )
                </SidebarMenuButton>
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
};
