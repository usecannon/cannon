'use client';
import { CommandPreview } from '@/components/CommandPreview';

export const AlterPage = () => {
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight mb-2.5">
        Modifying existing commands: <code>cannon alter</code> Command Guide
      </h2>

      <p className="pb-4 mb-6 border-b border-border text-xl text-muted-foreground">
        Modify existing deployment states with the `cannon alter` command.
      </p>

      <p className="mb-4">
        The <code>cannon alter</code> command in the Cannon CLI allows you to
        modify an existing deployment's state. This is useful for various tasks,
        such as overriding package IPFS URLs, marking troublesome steps as
        complete or incomplete, importing existing artifacts, and migrating
        deployments.
      </p>

      <h3 className="text-xl font-semibold mb-3 mt-9">Usage</h3>

      <div className="mb-4">
        <CommandPreview command="cannon alter <packageRef> <--subpkg subpkg...> <--chain-id chainId> <command> <targets...> [options]" />
      </div>

      <p className="mb-4">
        <strong>Arguments:</strong>
      </p>

      <ul className="list-disc list-inside mb-4">
        <li>
          <strong>
            <code>&lt;packageRef&gt;</code>:
          </strong>{' '}
          The package reference of the deployment you want to modify (e.g.,{' '}
          <code>my-package:v1.0.0</code>).
        </li>
        <li>
          <strong>
            <code>&lt;--subpkg subpkg...&gt;</code>:
          </strong>{' '}
          A series of subpackage path items, used when changing nested package
          deployments (ex. deployed with <code>clone</code>). If unspecified,
          modifies the top level package.
        </li>
        <li>
          <strong>
            <code>&lt;--chain-id chainId&gt;</code>:
          </strong>{' '}
          The chain ID of the network where the deployment exists. If
          unspecified, assumes cannon local network.
        </li>
        <li>
          <strong>
            <code>&lt;command&gt;</code>:
          </strong>{' '}
          The operation to perform. See below for a list of recognized
          operations.
        </li>
        <li>
          <strong>
            <code>&lt;targets...&gt;</code>:
          </strong>{' '}
          The target(s) of the operation, which vary depending on the operation.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Options:</strong>
      </p>

      <ul className="list-disc list-inside mb-4">
        <li>
          <strong>
            <code>--runtimeOverrides</code>:
          </strong>{' '}
          Allows overriding runtime settings.
        </li>
      </ul>

      <h3 className="text-xl font-semibold mb-3 mt-9">Commands</h3>

      <p className="mb-4">
        Here's a breakdown of the available operations and their usage:
      </p>

      <h4 className="text-lg font-semibold mb-2">
        1. <code>set-url</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Updates the URLs of imported deployments
        in the local state. This is useful when you want to import a related
        state from one network to another as a template to start from with other
        `alter` commands.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; set-url &lt;ipfs://Qm...&gt;" />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>&lt;targetUrl&gt;</code>: The IPFS URL of the new deployment to
          use.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter my-package:1.0.0 --chain-id 1 set-url ipfs://QmPW3HgfY1jYEv5B7mHzwh2MdT8PwDuiwAjLWKxnr1ztqW" />
      </div>

      <p className="mb-4">
        This command will update the imported deployment URLs within{' '}
        <code>my-package:v1.0.0</code> on chain ID 1 to the new URL{' '}
        <code>ipfs://QmPW3HgfY1jYEv5B7mHzwh2MdT8PwDuiwAjLWKxnr1ztqW</code>,
        which is the package IPFS URL of synthetix optimism deployment. A
        subsequent call to <code>my-package:v1.0.0 --chain-id 1</code> would
        yield the package data for synthetix optimism.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        2. <code>set-misc</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Sets the URL of the misc artifacts for the
        deployment.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; set-misc &lt;miscUrl&gt;" />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>&lt;miscUrl&gt;</code>: The URL of the misc artifacts.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 set-misc ipfs://Qm..." />
      </div>

      <p className="mb-4">
        This command will update the misc artifacts URL to{' '}
        <code>ipfs://Qm...</code>.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        3. <code>import</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Imports existing artifacts into a specific
        step of the deployment.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; import &lt;operationName&gt; &lt;existingArtifacts&gt;" />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>&lt;operationName&gt;</code>: The name of the step to import
          artifacts into.
        </li>
        <li>
          <code>&lt;existingArtifacts&gt;</code>: A comma-separated list of
          artifact keys.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 import deploy.MyContract address,abi" />
      </div>

      <p className="mb-4">
        This command will import the <code>address</code> and <code>abi</code>{' '}
        artifacts into the <code>deploy.MyContract</code> step.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        4. <code>set-contract-address</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Sets the address of a deployed contract
        within a specific step.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; set-contract-address &lt;contractName&gt; &lt;address&gt;" />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>&lt;contractName&gt;</code>: The name of the contract.
        </li>
        <li>
          <code>&lt;address&gt;</code>: The new contract address.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 set-contract-address MyContract 0x123..." />
      </div>

      <p className="mb-4">
        This command will set the address of the <code>MyContract</code>{' '}
        contract to <code>0x123...</code>.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        5. <code>mark-complete</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Marks one or more steps as complete.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; mark-complete &lt;operationName...&gt;" />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>&lt;operationName...&gt;</code>: One or more step names to mark
          as complete.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 mark-complete deploy.MyContract" />
      </div>

      <p className="mb-4">
        This command will mark the <code>deploy.MyContract</code> step as
        complete.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        6. <code>mark-incomplete</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Marks one or more steps as incomplete.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; mark-incomplete &lt;operationName...&gt;" />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>&lt;operationName...&gt;</code>: One or more step names to mark
          as incomplete.
        </li>
      </ul>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 mark-incomplete deploy.MyContract" />
      </div>

      <p className="mb-4">
        This command will mark the <code>deploy.MyContract</code> step as
        incomplete.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        7. <code>clean-unused</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Removes state entries for steps that are
        no longer defined in the deployment.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; clean-unused" />
      </div>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 clean-unused" />
      </div>

      <p className="mb-4">
        This command will clean up any unused state entries.
      </p>

      <h4 className="text-lg font-semibold mb-2">
        8. <code>migrate-212</code>
      </h4>

      <p className="mb-4">
        <strong>Description:</strong> Migrates a deployment from an older
        version (pre-2.1.2) to the current version. This includes renaming step
        types and updating nested provisions.
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter &lt;packageRef&gt; &lt;subpkg...&gt; &lt;chainId&gt; migrate-212" />
      </div>

      <p className="mb-4">
        <strong>Example:</strong>
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/my-package:v1.0.0 1 migrate-212" />
      </div>

      <p className="mb-4">
        This command will migrate the deployment to the current version.
      </p>

      <h3 className="text-xl font-semibold mb-3 mt-9">
        Subpackage Alterations
      </h3>

      <p className="mb-4">
        When deployments have nested package dependencies, the{' '}
        <code>&lt;subpkg...&gt;</code> argument becomes important. For example,
        if your main deployment <code>@my-org/main:1.0.0</code> depends on{' '}
        <code>@my-org/lib:1.0.0</code>, and you want to alter something within
        the library's deployment state, you would use:
      </p>

      <div className="mb-4">
        <CommandPreview command="cannon alter @my-org/main:1.0.0 provision.lib 1 set-contract-address LibContract 0x456..." />
      </div>

      <ul className="list-disc list-inside mb-4">
        <li>
          <code>provision.lib</code> refers to the provision step and the name
          of the imported package.
        </li>
      </ul>

      <p className="mb-4">
        This guide provides a comprehensive overview of the{' '}
        <code>cannon alter</code> command and its various subcommands. Remember
        to adapt the examples to your specific use cases.
      </p>
    </>
  );
};
