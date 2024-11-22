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
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import React, { FC } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
import scrollIntoView from 'scroll-into-view-if-needed';
import { Snippet } from '@/components/snippet';

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

const CustomTable: React.FC<{
  data: { key: string; dataType: string; value: string }[];
}> = ({ data }) => (
  <div className="overflow-x-auto mb-4">
    <Table>
      <TableHeader>
        <TableRow className="border-border">
          <TableHead className="pl-0 ">Name</TableHead>
          <TableHead className=" max-w-[180px]">Type</TableHead>
          <TableHead className=" max-w-[180px]">Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.key} className="border-border">
            <TableCell className="pl-0 ">{row.key}</TableCell>
            <TableCell className=" max-w-[180px]">
              <span className="text-xs font-medium">{row.dataType}</span>
            </TableCell>
            <TableCell className=" max-w-[180px]">{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const DocsCannonfilesPage: FC = () => {
  const { isLoading, data: cannonfileSpecs, error } = useCannonfileSpecs();
  const router = useRouter();

  React.useEffect(() => {
    const handleScroll = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const element = document.getElementById(hash);
        if (element) {
          scrollIntoView(element, {
            scrollMode: 'if-needed',
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      }
    };

    if (!isLoading) {
      handleScroll();
    }
  }, [router.events, isLoading]);

  if (isLoading) {
    return <CustomSpinner className="m-auto" />;
  }

  if (!cannonfileSpecs) {
    return <p>Error: {error?.message}</p>;
  }

  return (
    <div className="flex flex-1">
      <div className="container  max-w-4xl flex-1">
        <SidebarProvider>
          {/* Mobile trigger */}
          <div className="sticky top-0 z-40 md:hidden">
            <div className="flex h-14 items-center py-4">
              <SidebarTrigger>
                <Button variant="ghost" size="sm" className="-ml-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open sidebar</span>
                </Button>
              </SidebarTrigger>
            </div>
          </div>

          <div className="md:grid md:grid-cols-[160px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10 h-full">
            {/* Sidebar */}
            <Sidebar className="fixed top-14 z-30 -ml-2 hidden w-full shrink-0 md:sticky md:block md:top-0 md:border-none">
              <SidebarContent className="py-6 lg:py-8 bg-black">
                <SidebarGroup>
                  <SidebarGroupLabel>
                    Cannonfile Specification
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#cannonfile-metadata">Metadata</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#constants">Constants</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#utilities">Utilities</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      {Array.from(cannonfileSpecs, ([key]) => key)
                        .filter(
                          (key) =>
                            key !== 'metadata' &&
                            !cannonfileSpecs.get(key)?.deprecated
                        )
                        .map((key) => (
                          <SidebarMenuItem key={key}>
                            <SidebarMenuButton asChild>
                              <a href={`#${key}`} className="font-mono">
                                [{key}.*]
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel>Package Specification</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#deployment-data">Deployment Data</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#package-code">Package Code</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#metadata">Metadata</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                  <SidebarGroupLabel>Advanced Usage</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#factory-deployed-contracts">
                            Factory Contracts
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#extras">Event Data</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href="#event-error-logging">Event Error Logging</a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
            </Sidebar>

            {/* Main content */}
            <main className="flex w-full flex-col py-10">
              <div className="max-w-[1024px]">
                {/* Rest of your existing content, starting with the title */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold mb-4">
                    Cannonfile Documentation
                  </h1>
                  <p className="mb-4">
                    Cannonfiles are like deployment plans. They include
                    operations that specify the desired state of a blockchain.
                    The web app and the CLI can be used to <code>build</code>{' '}
                    the blockchain into this state. This results in a package of
                    data pertaining to the deployment, which can be uploaded
                    using IPFS and published to the registry on Ethereum.
                    Deployments that upgrade from existing packages will
                    recognize which operations have been completed, executing
                    only those that have been added or changed.
                  </p>
                  <p className="mb-4">
                    Each operation has a type and a name, like{' '}
                    <code>[deploy.MyContract]</code>. Each type accepts a
                    specific set of inputs (documented below) and can modify{' '}
                    <code>settings</code> and <code>imports</code> objects
                    (which can be referenced in{' '}
                    <a
                      href="https://lodash.com/docs/4.17.15#template"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      templates
                    </a>{' '}
                    like <code>name=&lt;%= settings.name %&gt;</code>). The
                    templates can also use{' '}
                    <a
                      href="https://github.com/wevm/viem/tree/main/src/utils"
                      target="_blank"
                      rel="noopener noreferrer"
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
                    . The objects are also passed into cannonfiles that
                    reference them with the <code>pull</code> and{' '}
                    <code>clone</code> operations.
                  </p>
                  <p className="mb-4">
                    Packages that result from <code>build</code>s consist of
                    three JSON files, which are compressed and uploaded using
                    IPFS: <a href="#deployment-data">deployment data</a>,{' '}
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
                      utility functions are available inside interpolation
                      values, e.g.:
                    </p>
                    <CommandPreview
                      command={'args = ["<%= keccak256(\'some string\') %>"]'}
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
                        <h3 className="text-lg mb-2">
                          <code className="px-0">{key}</code>
                          <a
                            href={`#${key}`}
                            className="ml-2 no-underline hover:underline"
                          >
                            #
                          </a>
                          {value.deprecated && (
                            <Badge
                              variant="secondary"
                              className="ml-3 -translate-y-0.5"
                            >
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
                    <p className="mb-4">
                      Primary source of cannon package information which
                      contains package definition and on-chain state data
                      derived changes made by defined steps in the cannonfile
                      definition. Deployment data is stored on IPFS and is
                      locally stored in your filesystem in the default storage
                      location
                      <code>~/.local/share/cannon/tags</code> or the storage
                      location defined by the CANNON_DIRECTORY environment
                      variable.
                    </p>
                    <p>Here is an example of a cannon deployment data:</p>
                    <Snippet>
                      <code>
                        {JSON.stringify(deploymentDataExample, null, 2)}
                      </code>
                    </Snippet>
                  </div>

                  <div className="mb-16" id="package-code">
                    <h3 className="text-lg mb-4">Package Code</h3>
                    <p className="mb-4">
                      Contains artifact data and other contract source code data
                      about the contracts deployed during the build.
                    </p>
                    <p>Here is an example of a deployments package data:</p>
                    <Snippet>
                      <code>
                        {JSON.stringify(artifactDataExample, null, 2)}
                      </code>
                    </Snippet>
                  </div>

                  <div className="mb-16" id="metadata">
                    <h3 className="text-lg mb-4">Metadata</h3>
                    <p>
                      Metadata contains external information related to the
                      cannon package. Currently metadata includes the following:
                      <ul>
                        <li> Git Repo URL</li>
                        <li>
                          Commit hash of the changes in which the last instance
                          of the package were made
                        </li>
                        <li>Link to the package git repo README file</li>
                      </ul>
                      Metadata is also stored on IPFS and is locally stored in
                      your filesystem in the default storage location
                      <code>~/.local/share/cannon/tags</code> or the storage
                      location defined by the CANNON_DIRECTORY environment
                      variable.
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <h2 className="text-2xl mb-5">Advanced Usage</h2>

                  <div className="mb-16" id="factory-deployed-contracts">
                    <h3 className="text-lg mb-4">Factory-deployed Contracts</h3>
                    <p className="mb-4">
                      Smart contracts may have functions which deploy other
                      smart contracts. Contracts which deploy others are
                      typically referred to as factory contracts. You can
                      reference contracts deployed by factories in your
                      cannonfile.
                    </p>
                    <p className="mb-4">
                      For example, if the deployPool function below deploys a
                      contract, the following invoke command registers that
                      contract based on event data emitted from that call.
                    </p>
                    <Snippet>
                      <code>{`[invoke.deployment]
target = ["PoolFactory"]
func = "deployPool"
factory.MyPoolDeployment.artifact = "Pool"
# alternatively, if the code for the deployed contract is not available in your artifacts, you can also reference the ABI like:
factory.MyPoolDeployment.abiOf = "PreviousPool"
factory.MyPoolDeployment.event = "NewDeployment"
factory.MyPoolDeployment.arg = 0`}</code>
                    </Snippet>
                    <p className="mb-4 mt-4">
                      Specifically, this would anticipate this invoke call will
                      emit an event named NewDeployment with a contract address
                      as the first data argument (per arg, a zero-based index).
                      This contract should implement the Pool contract. Now, a
                      subsequent invoke operation could set
                    </p>
                    <Snippet>
                      <code>{'target = ["MyPoolDeployment"]'}</code>
                    </Snippet>
                    <p className="mb-4 mt-4">
                      To reference contract information for a contract deployed
                      on a previous invoke operation such as the example shown
                      above call the contracts object inside your cannonfile.
                      For example{' '}
                    </p>
                    <Snippet>
                      <code>{'<%= contracts.MyPoolDeployment.address %>'}</code>
                    </Snippet>
                    <p className="mb-4 mt-4">
                      would return the address of the Pool contract deployed by
                      the PoolFactory contract.
                    </p>
                    <p className="mb-4">
                      If the invoked function deploys multiple contracts of the
                      same name, you can specify them by index through the
                      contracts object.
                    </p>
                    <Snippet>
                      <code>{'<%= contracts.MyPoolDeployment.address %>'}</code>
                    </Snippet>
                    <p className="mb-4 mt-4">
                      would return the first deployed Pool contract address.
                    </p>
                    <Snippet>
                      <code>
                        {'<%= contracts.MyPoolDeployment_0.address %>'}
                      </code>
                    </Snippet>
                    <p className="mb-4 mt-4">
                      would return the second deployed Pool contract address.
                      These contracts are added to the return object as they
                      would be if deployed by a contract operation.
                    </p>
                  </div>

                  <div className="mb-16" id="var">
                    <h3 className="text-lg mb-4">
                      Use Event Data in a Variable
                    </h3>
                    <p className="mb-4">
                      If an invoked function emits an event, cannon can parse
                      the event data in your cannonfile by using the var
                      property, This lets you reference previously emitted
                      event’s data in subsequent invoke operations.
                    </p>
                    <p className="mb-4">
                      For example, to track the NewDeployment event data from
                      the PoolFactory deployment from the example above, add the
                      var property and set an attribute for the event like so:
                    </p>
                    <Snippet>
                      <code>{`[invoke.deployment]
target = ["PoolFactory"]
var.NewDeploymentEvent.event = "NewDeployment"
var.NewDeploymentEvent.arg = 0
                        `}</code>
                    </Snippet>
                    <p className="mb-4">Now, calling </p>

                    <Snippet>
                      <code>{'<%= settings.NewDeploymentEvent %>'}</code>
                    </Snippet>

                    <p className="mt-4 mb-4">
                      in a subsequent invoke operation would return the first
                      data argument for NewDeployment.
                    </p>

                    <p className="mb-4">
                      If an invoked function emits multiple events you can
                      specify them by index.
                    </p>

                    <p className="mb-4">
                      For example if the PoolFactory emitted multiple
                      NewDeployment events:
                    </p>
                    <Snippet>
                      <code>{'<%= settings.NewDeploymentEvent_0 %>'}</code>
                    </Snippet>
                    <p className="mt-4 mb-4">
                      would return the first emitted event of this kind.
                    </p>
                  </div>

                  <div className="mb-16" id="event-error-logging">
                    <h3 className="text-lg mb-4">Event Error Logging</h3>
                    <p className="mb-4">
                      If an event is specified in the cannonfile but the invoke
                      function does not emit any events or emits an event that
                      doesn’t match the one specified in the cannonfile, the
                      invoke operation will fail with an error.
                    </p>

                    <p className="mb-4">
                      You can bypass the event error logging by setting it like{' '}
                    </p>

                    <Snippet>
                      <code>
                        {'var.NewDeploymentEvent.allowEmptyEvents = true'}
                      </code>
                    </Snippet>

                    <p className="mb-4 mt-4">or </p>

                    <Snippet>
                      <code>
                        {'factory.MyPoolDeployment.allowEmptyEvents = true'}
                      </code>
                    </Snippet>

                    <p className="mb-4 mt-4">
                      under the factory or var property that throws an error.
                    </p>
                    <p className="mb-4">
                      An useful example would for this would be when an event is
                      only emitted under certain conditions but you still need
                      to reference it when it is emitted or don’t want to halt
                      execution when it’s not emitted.
                    </p>
                    <p className="mb-4">
                      Keep in mind you wont be able to reference event or
                      contract data through the contracts or settings properties
                      if a matching event wasnt emitted
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default DocsCannonfilesPage;
