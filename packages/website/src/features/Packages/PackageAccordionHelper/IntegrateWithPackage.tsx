import CodePreview from '@/components/CodePreview';
import { ItemBodyWrapper } from '@/features/Packages/PackageAccordionHelper/utils';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import Link from 'next/link';
import camelCase from 'lodash/camelCase';
import { ChainDefinition, getArtifacts } from '@usecannon/builder';
import { DeploymentState } from '@usecannon/builder';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

function generateSettingsText(settings?: Record<string, unknown>) {
  let text = '';
  for (const key in settings) {
    text += `options.${key} = "${settings[key]}"\n`;
  }
  return text.trim();
}

type Props = {
  name: string;
  chainId: number;
  preset: string;
  version: string;
  chainDefinition: ChainDefinition;
  deploymentState: DeploymentState;
};

export default function IntegrateWithPackage({
  name,
  chainId,
  preset,
  version,
  chainDefinition,
  deploymentState,
}: Props) {
  const contextDataCode = getArtifacts(chainDefinition, deploymentState);

  const _preset = preset !== 'main' ? `@${preset}` : '';
  const _version = version !== 'latest' ? `:${version}` : '';
  const _source = `"${name.toLowerCase()}${_version}${_preset}"`;

  const pullCode = `[pull.${camelCase(name)}]
source = ${_source}
`;

  const cloneCode = `[clone.${camelCase(name)}]
source = ${_source}
target = "PACKAGE_NAME@${camelCase(
    name
  )}${_preset}" # Replace with a name:version@preset for your cloned instance.
${generateSettingsText(contextDataCode.settings)}
`.trim();

  const interactCode = chainId == 13370 ? cloneCode : pullCode;

  return (
    <TooltipProvider>
      <ItemBodyWrapper
        titleText="Use this package in your cannonfile"
        titleAction={
          <Button variant="outline" asChild>
            <Link href="/learn/cannonfile/">Build a cannonfile</Link>
          </Button>
        }
      >
        <div className="flex items-center mb-2">
          <p className="mr-1.5 text-sm text-gray-200">Add to Cannonfile</p>
          <Tooltip>
            <TooltipTrigger>
              <InfoCircledIcon className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>
              Options listed below show their default values. You can override
              them or omit them from your cannonfiles.
            </TooltipContent>
          </Tooltip>
        </div>

        <CodePreview
          code={interactCode}
          height="150px"
          language="ini"
          editorProps={{
            options: {
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            },
          }}
        />

        <div className="flex items-center mt-4 mb-2">
          <p className="mr-1.5 text-sm text-gray-200">
            Cannonfile Context Data
          </p>
          <Tooltip>
            <TooltipTrigger>
              <InfoCircledIcon className="h-3 w-3" />
            </TooltipTrigger>
            <TooltipContent>
              {`After adding the ${
                chainId == 13370 ? 'clone' : 'pull'
              } operation to your cannonfile, you can reference the following data in other operations using EJS syntax.`}
            </TooltipContent>
          </Tooltip>
        </div>

        <CodePreview
          code={JSON.stringify(contextDataCode, null, 2)}
          height="250px"
          language="ini"
          editorProps={{
            options: {
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
            },
          }}
        />
      </ItemBodyWrapper>
    </TooltipProvider>
  );
}
