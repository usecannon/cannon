'use client';

import { CommandPreview } from '@/components/CommandPreview';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useCannonfileSpecs } from '@/hooks/cannonfileSpecs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import React, { FC } from 'react';
import { a11yDark, CodeBlock } from 'react-code-blocks';

const artifactDataExample = {
  artifacts: {
    MyContract: {
      _format: 'hh-sol-artifact-1',
      contractName: 'MyContract',
      sourceName: 'contracts/MyContract.sol',
      abi: ['...'],
      bytecode: '0x...',
      deployedBytecode: '0x...',
      linkReferences: {},
      deployedLinkReferences: {},
      source: {
        solcVersion: '0.8.24+commit.e11b9ed9',
        input:
          '{"language":"Solidity","sources":{"example/example/contracts/MyContract.sol":{"content":\\ Your Contract Source Code',
      },
    },
  },
};

const deploymentDataExample = {
  generator: 'cannon cli 2.15.0',
  timestamp: 1718767889,
  def: {
    name: 'my-package',
    version: '1.0.0',
    setting: {
      owner: {
        defaultValue: '0x...',
      },
    },
    contract: {
      MyContract: {
        artifact: 'MyContract',
        owner: '<%= settings.owner %>',
      },
    },
  },
  state: {
    'setting.owner': {
      artifacts: {
        settings: {
          owner: '0x...',
        },
      },
      hash: '...',
      version: 7,
    },
    'contract.MyContract': {
      artifacts: {
        contracts: {
          Implementation: {
            address: '0x...',
            abi: ['...'],
            constructorArgs: ['...'],
            linkedLibraries: {},
            deployTxnHash: '0x...',
            sourceName: 'contracts/MyContract.sol',
            contractName: 'MyContract',
            deployedOn: 'contract.MyContract',
            gasUsed: 2172726,
            gasCost: '4726073795',
          },
        },
      },
      hash: '...',
      version: 7,
    },
  },
  options: {},
  meta: {
    name: 'my-package',
    version: '1.0.0',
    private: true,
    description: 'My Custom Contract package',
    scripts: {
      test: 'hardhat compile && hardhat --network hardhat test',
      coverage: 'hardhat coverage',
    },
    repository: {
      type: 'git',
      url: 'git+https://github.com/example/example.git',
    },
    author: '',
    license: 'MIT',
    bugs: {
      url: 'https://github.com/example/example/issues',
    },
    homepage: 'https://github.com/example/example#readme',
    devDependencies: {
      ethers: '5.7.1',
      hardhat: '^2.22.3',
      'hardhat-cannon': '^2.14.3',
    },
  },
  miscUrl: 'ipfs://Qm...',
};

interface LinkItem {
  href: string;
  text: string;
  monospace?: boolean;
}

interface SectionProps {
  title: string;
  links: LinkItem[];
}

const Section: FC<SectionProps> = ({ title, links }) => (
  <div className="my-4">
    <h3 className="font-medium text-sm text-gray-200 tracking-wide px-2 mb-1.5">
      {title}
    </h3>
    <div className="mb-6">
      {links.map((link, index) => (
        <a
          key={index}
          className={`block no-underline rounded-md mb-0.5 py-0.5 px-2 cursor-pointer text-sm hover:bg-gray-800 ${
            link.monospace ? 'font-mono' : ''
          }`}
          href={link.href}
        >
          {link.text}
        </a>
      ))}
    </div>
  </div>
);

const CustomTable: React.FC<{
  data: { key: string; dataType: string; value: string }[];
}> = ({ data }) => (
  <div className="overflow-x-auto mb-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-gray-300 pl-0 border-gray-500">Name</TableHead>
          <TableHead className="text-gray-300 border-gray-500 max-w-[180px]">Type</TableHead>
          <TableHead className="text-gray-300 border-gray-500 max-w-[180px]">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="pl-0 border-gray-500">
              {row.key}
            </TableCell>
            <TableCell className="border-gray-500 max-w-[180px]">
              <span className="text-gray-300 text-xs font-medium">
                {row.dataType}
              </span>
            </TableCell>
            <TableCell className="border-gray-500 max-w-[180px]">{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const DocsCannonfilesPage: FC = () => {
  const { isLoading, data: cannonfileSpecs, error } = useCannonfileSpecs();

  if (isLoading) {
    return <CustomSpinner className="m-auto" />;
  }

  if (!cannonfileSpecs) {
    return <p>Error: {error?.message}</p>;
  }

  return (
    <div className="flex flex-1 flex-col max-h-full max-w-full">
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="
          flex flex-col overflow-y-auto 
          w-full md:w-[240px] md:max-w-[240px]
          max-h-[140px] md:max-h-[calc(100vh-151px)]
          border-b border-gray-600 md:border-b-0 md:border-r md:border-gray-700
        ">
          <div className="px-3 pb-2">
            <Section
              title="Cannonfile Spec"
              links={[
                { href: '#cannonfile-metadata', text: 'Metadata' },
                { href: '#constants', text: 'Constants' },
                { href: '#utilities', text: 'Utilities' },
                ...Array.from(cannonfileSpecs, ([key]) => key)
                  .filter(
                    (key) =>
                      key !== 'metadata' &&
                      !cannonfileSpecs.get(key)?.deprecated
                  )
                  .map((key) => ({
                    href: `#${key}`,
                    text: `[${key}.*]`,
                    monospace: true,
                  })),
              ]}
            />
            <Section
              title="Package Specification"
              links={[
                { href: '#deployment-data', text: 'Deployment Data' },
                { href: '#package-code', text: 'Package Code' },
                { href: '#metadata', text: 'Metadata' },
              ]}
            />
            <Section
              title="Advanced Usage"
              links={[
                {
                  href: '#factory-deployed-contracts',
                  text: 'Factory-deployed Contracts',
                },
                {
                  href: '#extras',
                  text: 'Save Emitted Event Data in a Variable',
                },
                { href: '#event-error-logging', text: 'Event Error Logging' },
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-151px)]">
          <div className="container max-w-[1024px] ml-0 p-8">
            <div className="mb-8">
              <h1 className="text-3xl mb-4">Cannonfile Documentation</h1>
              <p className="mb-4">
                Cannonfiles are like deployment plans. They include operations
                that specify the desired state of a blockchain. The web app and
                the CLI can be used to <code>build</code> the blockchain into
                this state. This results in a package of data pertaining to the
                deployment, which can be uploaded using IPFS and published to
                the registry on Ethereum. Deployments that upgrade from existing
                packages will recognize which operations have been completed,
                executing only those that have been added or changed.
              </p>
              <p className="mb-4">
                Each operation has a type and a name, like{' '}
                <code>[deploy.MyContract]</code>. Each type accepts a specific
                set of inputs (documented below) and can modify{' '}
                <code>settings</code> and <code>imports</code> objects (which
                can be referenced in{' '}
                <a
                  href="https://lodash.com/docs/4.17.15#template"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  templates
                </a>
                like
                <code>name=&lt;%= settings.name %&gt;</code>). The templates can
                also use{' '}
                <a
                  href="https://github.com/wevm/viem/tree/main/src/utils"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  utilities
                </a>
                ,{' '}
                <a
                  href="https://github.com/wevm/viem/blob/main/src/constants/number.ts"
                  target="_blank"
                >
                  number constants
                </a>
                , and{' '}
                <a
                  href="https://github.com/wevm/viem/blob/main/src/constants/address.ts"
                  target="_blank"
                >
                  some
                </a>{' '}
                <a
                  href="https://github.com/wevm/viem/blob/main/src/constants/bytes.ts"
                  target="_blank"
                >
                  others
                </a>{' '}
                from{' '}
                <a href="https://viem.sh/" target="_blank">
                  viem
                </a>
                . The objects are also passed into cannonfiles that reference
                them with the <code>pull</code> and <code>clone</code>{' '}
                operations.
              </p>
              <p className="mb-4">
                Packages that result from <code>build</code>s consist of three
                JSON files, which are compressed and uploaded using IPFS:{' '}
                <a href="#deployment-data" className="text-blue-400 hover:text-blue-300">
                  deployment data
                </a>,{' '}
                <a href="#package-code">code</a>, and{' '}
                <a href="#metadata">metadata</a>.
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl mb-5">Cannonfile Specification</h2>
              <div className="mb-16" id="cannonfile-metadata">
                <h3 className="text-lg mb-4">Metadata</h3>
                <p className="mb-4">
                  {cannonfileSpecs.get('metadata')?.description}
                </p>
                <CustomTable
                  data={
                    cannonfileSpecs.get('metadata')?.specs.map((spec) => ({
                      key: spec.name,
                      dataType: spec.type,
                      value: spec.description,
                    })) ?? []
                  }
                />
              </div>
              <div className="mb-16" id="constants">
                <h3 className="text-lg mb-4">Constants</h3>
                <p className="mb-4">
                  The following constants can be referenced in a Cannonfile
                </p>
                <CustomTable
                  data={[
                    {
                      key: 'AddressZero | zeroAddress',
                      dataType: 'string',
                      value:
                        'Zero Addres string: "0x0000000000000000000000000000000000000000".',
                    },
                    {
                      key: 'HashZero | zeroHash',
                      dataType: 'string',
                      value:
                        'Zero hash value: "0x0000000000000000000000000000000000000000000000000000000000000000"',
                    },
                    {
                      key: 'maxInt8...256',
                      dataType: 'number',
                      value:
                        'BigNumber values representing from maxInt8 to maxInt256.',
                    },
                    {
                      key: 'minInt8...256',
                      dataType: 'number',
                      value:
                        'BigNumber values representing from minInt8 to minInt256.',
                    },
                    {
                      key: 'maxUint8...256',
                      dataType: 'number',
                      value:
                        'BigNumber values representing from maxUint8 to maxUint256.',
                    },
                  ]}
                />
              </div>
              <div className="mb-16" id="utilities">
                <h3 className="text-lg mb-4">Utilities</h3>
                <p className="mb-4">
                  <a
                    href="https://viem.sh/docs/utilities/getAddress"
                    target="_blank"
                  >
                    Viem.sh
                  </a>{' '}
                  utility functions are available inside interpolation values,
                  e.g.:
                </p>
                <CommandPreview
                  backgroundColor="black"
                  command={'args = ["<%=  keccak256(\'some string\') %>"]'}
                />
              </div>
              {Array.from(cannonfileSpecs)
                .sort((a, b) => {
                  const aDeprecated = cannonfileSpecs?.get(a[0])?.deprecated
                    ? 1
                    : 0;
                  const bDeprecated = cannonfileSpecs?.get(b[0])?.deprecated
                    ? 1
                    : 0;
                  return aDeprecated - bDeprecated;
                })
                .filter(([key]) => key !== 'metadata')
                .map(([key, value]) => (
                  <div key={key} id={key} className="mb-16">
                    <h3 className="text-lg">
                      <code className="px-0">{key}</code>
                      <a
                        href={`#${key}`}
                        className="text-gray-300 ml-2 no-underline hover:underline"
                      >
                        #
                      </a>
                      {value.deprecated && (
                        <Badge className="ml-3 transform-translate-y-1.5 pt-0.5">
                          Deprecated
                        </Badge>
                      )}
                    </h3>
                    <p className="mb-4">{value.description}</p>
                    <CustomTable
                      data={value.specs.map((spec) => ({
                        key: spec.name,
                        dataType: spec.type,
                        value: spec.description,
                      }))}
                    />
                  </div>
                ))}
            </div>
            <div className="mb-8">
              <h2 className="text-2xl mb-5">Package Specification</h2>

              <div className="mb-16" id="deployment-data">
                <h3 className="text-lg mb-4">Deployment Data</h3>
                <p className="text-gray-400">
                  Primary source of cannon package information which contains
                  package definition and on-chain state data derived changes
                  made by defined steps in the cannonfile definition. Deployment
                  data is stored on IPFS and is locally stored in your
                  filesystem in the default storage location
                  <code>~/.local/share/cannon/tags</code> or the storage
                  location defined by the CANNON_DIRECTORY environment variable.
                  <br />
                  <br />
                  Here is an example of a cannon deployment data:
                  <CodeBlock
                    text={JSON.stringify(deploymentDataExample, null, 2)}
                    language="bash"
                    showLineNumbers={false}
                    theme={a11yDark}
                    customStyle={{ fontSize: '14px', maxHeight: '10rem' }}
                  />
                </p>
              </div>

              <div className="mb-16" id="package-code">
                <h3 className="text-lg mb-4">Package Code</h3>
                <p className="text-gray-400">
                  Contains artifact data and other contract source code data
                  about the contracts deployed during the build.
                  <br />
                  <br />
                  Here is an example of a deployments package data:
                  <CodeBlock
                    text={JSON.stringify(artifactDataExample, null, 2)}
                    language="bash"
                    showLineNumbers={false}
                    theme={a11yDark}
                    customStyle={{ fontSize: '14px', maxHeight: '10rem' }}
                  />
                </p>
              </div>

              <div className="mb-16" id="metadata">
                <h3 className="text-lg mb-4">Metadata</h3>
                <p className="text-gray-400">
                  Metadata contains external information related to the cannon
                  package. Currently metadata includes the following:
                  <ul>
                    <li> Git Repo URL</li>
                    <li>
                      Commit hash of the changes in which the last instance of
                      the package were made
                    </li>
                    <li>
                      Link to the package git repo README file
                    </li>
                  </ul>
                  Metadata is also stored on IPFS and is locally stored in your
                  filesystem in the default storage location
                  <code>~/.local/share/cannon/tags</code> or the storage
                  location defined by the CANNON_DIRECTORY environment variable.
                </p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl mb-5">Advanced Usage</h2>

              <div className="mb-16" id="factory-deployed-contracts">
                <h3 className="text-lg mb-4">Factory-deployed Contracts</h3>
                <p className="mb-4">
                  Smart contracts may have functions which deploy other smart
                  contracts. Contracts which deploy others are typically
                  referred to as factory contracts. You can reference contracts
                  deployed by factories in your cannonfile.
                </p>

                <p className="mb-4">
                  For example, if the deployPool function below deploys a
                  contract, the following invoke command registers that contract
                  based on event data emitted from that call.
                </p>

                <div className="mb-4">
                  <code className="block">[invoke.deployment]</code>
                  <code className="block">
                    target = [&quot;PoolFactory&quot;]
                  </code>
                  <code className="block">func = &quot;deployPool&quot;</code>
                  <code className="block">
                    factory.MyPoolDeployment.artifact = &quot;Pool&quot;
                  </code>
                  <code className="block">
                    # alternatively, if the code for the deployed contract is
                    not available in your artifacts, you can also reference the
                    ABI like:
                  </code>
                  <code className="block">
                    # factory.MyPoolDeployment.abiOf = &quot;PreviousPool&quot;
                  </code>
                  <code className="block">
                    factory.MyPoolDeployment.event = &quot;NewDeployment&quot;
                  </code>
                  <code className="block">factory.MyPoolDeployment.arg = 0</code>
                </div>

                <p className="mb-4">
                  Specifically, this would anticipate this invoke call will emit
                  an event named NewDeployment with a contract address as the
                  first data argument (per arg, a zero-based index). This
                  contract should implement the Pool contract. Now, a subsequent
                  invoke operation could set target =
                  [&quot;MyPoolDeployment&quot;].
                </p>

                <p className="mb-4">
                  To reference contract information for a contract deployed on a
                  previous invoke operation such as the example shown above call
                  the contracts object inside your cannonfile. For example
                  &lt;%= contracts.MyPoolDeployment.address %&gt; would return
                  the address of the Pool contract deployed by the PoolFactory
                  contract.
                </p>

                <p className="mb-4">
                  If the invoked function deploys multiple contracts of the same
                  name, you can specify them by index through the contracts
                  object. &lt;%= contracts.MyPoolDeployment.address %&gt; would
                  return the first deployed Pool contract address. &lt;%=
                  contracts.MyPoolDeployment_0.address %&gt; would return the
                  second deployed Pool contract address. These contracts are
                  added to the return object as they would be if deployed by a
                  contract operation.
                </p>
              </div>

              <div className="mb-16" id="var">
                <h3 className="text-lg mb-4">Save Emitted Event Data in a Variable</h3>
                <p className="mb-4">
                  If an invoked function emits an event, cannon can parse the
                  event data in your cannonfile by using the var property, This
                  lets you reference previously emitted event’s data in
                  subsequent invoke operations.
                </p>
                <p className="mb-4">
                  For example, to track the NewDeployment event data from the
                  PoolFactory deployment from the example above, add the var
                  property and set an attribute for the event like so:
                </p>

                <div className="mb-4">
                  <code className="block">[invoke.deployment]</code>
                  <code className="block">
                    target = [&quot;PoolFactory&quot;]
                  </code>
                  <code className="block"># ....</code>
                  <code className="block">
                    var.NewDeploymentEvent.event = &quot;NewDeployment&quot;
                  </code>
                  <code className="block">var.NewDeploymentEvent.arg = 0</code>
                </div>

                <p className="mb-4">
                  Now, calling &quot;&lt;% = settings.NewDeploymentEvent
                  %&gt;&quot; in a subsequent invoke operation would return the
                  first data argument for NewDeployment.
                </p>

                <p className="mb-4">
                  If an invoked function emits multiple events you can specify
                  them by index.
                </p>

                <p className="mb-4">
                  For example if the PoolFactory emitted multiple NewDeployment
                  events: &lt;%= settings.NewDeploymentEvent_0 %&gt; would
                  return the first emitted event of this kind. &lt;%=
                  settings.NewDeploymentEvent_4 %&gt; would reference the fifth
                  emitted event of this kind.
                </p>
              </div>

              <div className="mb-16" id="event-error-logging">
                <h3 className="text-lg mb-4">Event Error Logging</h3>
                <p className="mb-4">
                  If an event is specified in the cannonfile but the invoke
                  function does not emit any events or emits an event that
                  doesn’t match the one specified in the cannonfile, the invoke
                  operation will fail with an error.
                </p>

                <p className="mb-4">
                  You can bypass the event error logging by setting it like
                  <code>var.NewDeploymentEvent.allowEmptyEvents = true</code> or
                  <code>
                    factory.MyPoolDeployment.allowEmptyEvents = true
                  </code>{' '}
                  under the factory or var property that throws an error.
                </p>
                <p className="mb-4">
                  An useful example would for this would be when an event is
                  only emitted under certain conditions but you still need to
                  reference it when it is emitted or don’t want to halt
                  execution when it’s not emitted.
                </p>
                <p className="mb-4">
                  Keep in mind you wont be able to reference event or contract
                  data through the contracts or settings properties if a
                  matching event wasnt emitted
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsCannonfilesPage;
