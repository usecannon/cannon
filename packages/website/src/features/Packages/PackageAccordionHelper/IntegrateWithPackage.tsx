import { useMemo } from 'react';
import camelCase from 'lodash/camelCase';
import {
  CANNON_CHAIN_ID,
  ChainDefinition,
  getArtifacts,
  PackageReference,
} from '@usecannon/builder';
import { DeploymentState } from '@usecannon/builder';
import Link from 'next/link';
import { badgeVariants } from '@/components/ui/badge';
import { Snippet } from '@/components/snippet';
import CodePreview from '@/components/CodePreview';

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
  const pkgRef = PackageReference.from(name, version, preset);
  const stepName = camelCase(pkgRef.name);
  const code = useMemo(
    () => JSON.stringify(contextDataCode || '', null, 2),
    [contextDataCode]
  );

  const pullCode = `[pull.${stepName}]
source = "${pkgRef.fullPackageRef}"
`;

  const cloneCode = `[clone.${stepName}]
source = "${pkgRef.fullPackageRef}"
target = "TARGET_PACKAGE_NAME:TARGET_VERSION@TARGET_PRESET" # Replace with a name:version@preset for your cloned instance.
${generateSettingsText(contextDataCode.settings)}
`.trim();

  const displayCode = chainId === CANNON_CHAIN_ID ? cloneCode : pullCode;

  return (
    <div className="space-y-6 flex flex-col">
      <div>
        <p className="mb-2 flex items-center">
          Add the following to your Cannonfile to{' '}
          {chainId === CANNON_CHAIN_ID ? (
            <>
              deploy your own instance of this package.{' '}
              <Link
                href="/learn/cannonfile#clone"
                className={badgeVariants({ variant: 'secondary' }) + ' ml-2'}
              >
                Learn more
              </Link>
            </>
          ) : (
            <>
              import data from this package.{' '}
              <Link
                href="/learn/cannonfile#pull"
                className={badgeVariants({ variant: 'secondary' }) + ' ml-2'}
              >
                Learn more
              </Link>
            </>
          )}
        </p>

        <Snippet>
          <code>{displayCode}</code>
        </Snippet>

        <p className="text-sm text-foreground/60 mt-1">
          The options listed above show the default values. You can override or
          omit them.
        </p>
      </div>
      <div>
        <p className="mb-2">
          Then reference the following data in other Cannonfile operations using
          EJS syntax, like <code>{'<%= settings.example %>'}</code>
        </p>

        <CodePreview
          code={code}
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
      </div>
    </div>
  );
}
