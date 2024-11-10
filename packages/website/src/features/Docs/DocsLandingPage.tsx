import { links } from '@/constants/links';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const DocsLandingPage = () => {
  return (
    <div className="container max-w-[42rem] pt-10 md:pt-20">
      <h1 className="scroll-m-20 text-3xl font-bold tracking-tight">
        Introducing Cannon
      </h1>

      <p className="leading-7 [&:not(:first-child)]:mt-4">
        <strong>Cannon</strong> is a DevOps tool for protocols on Ethereum. It
        manages protocol and smart contract deployments for local development
        and live networks.
      </p>

      <p className="leading-7 [&:not(:first-child)]:mt-6">
        Drawing inspiration from <em>Infrastructure as Code</em> tools like
        Terraform and CloudFormation, Cannon replaces deploy scripts with{' '}
        <Link
          href={links.CANNONFILE}
          className="no-underline border-b border-gray-500 hover:border-gray-400"
        >
          Cannonfiles
        </Link>
        .
      </p>

      <p className="leading-7 [&:not(:first-child)]:mt-6">
        Cannonfiles consist of operations that acheive a desired state of a
        blockchain (rather than a list of transactions to execute). For example,
        you may want a chain to have particular smart contracts and protocols
        deployed with certain functions called on them. If an operation has
        already been executed, it won’t be repeated.
      </p>

      <p className="leading-7 [&:not(:first-child)]:mt-6">
        Then you can <strong>build</strong> the chain into this state using the{' '}
        <Link
          href={links.CLI}
          className="no-underline border-b border-gray-500 hover:border-gray-400"
        >
          command-line interface
        </Link>{' '}
        or the{' '}
        <Link
          href={links.DEPLOY}
          className="no-underline border-b border-gray-500 hover:border-gray-400"
        >
          deployer
        </Link>
        . This generates a package with information related to the deployment.
        Packages can be published to the{' '}
        <Link
          href={links.EXPLORE}
          className="no-underline border-b border-gray-500 hover:border-gray-400"
        >
          registry
        </Link>
        .
      </p>

      <p className="leading-7 [&:not(:first-child)]:mt-6">
        Packages enable composability in Cannonfiles. If a package includes a
        &ldquo;Cannon&rdquo; deployment, it can be <em>cloned</em> to{' '}
        <Link
          href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.toml#L27"
          className="no-underline border-b border-gray-500 hover:border-gray-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          create a new instance of the protocol or smart contract
        </Link>
        . Packages with live network deployments can be <em>pulled</em>,
        allowing protocols to connect with{' '}
        <Link
          href="https://github.com/Synthetixio/synthetix-sandbox/blob/main/cannonfile.prod.toml#L5"
          className="no-underline border-b border-gray-500 hover:border-gray-400"
          target="_blank"
          rel="noopener noreferrer"
        >
          existing deployments
        </Link>
        .
      </p>

      <h4 className="text-xl mt-6 lg:mt-24 mb-5">
        Cannon is useful across the entire protocol development lifecycle...
      </h4>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-border p-5">
          <h2 className="scroll-m-20 text-xl lg:text-2xl font-semibold tracking-tight flex items-center mb-2">
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
            Protocol Development
          </h2>
          <p className="text-sm">
            Developers can specify a chain state like ordering a sandwich. The
            ingredients of a{' '}
            <Link
              href={links.CANNONFILE}
              className="no-underline border-b border-gray-500 hover:border-gray-400"
            >
              cannonfile
            </Link>{' '}
            may include existing protocols, dynamic function calls, and the
            smart contracts under development.
          </p>
        </div>

        <div className="rounded-lg border border-border p-5">
          <h2 className="scroll-m-20 text-xl lg:text-2xl font-semibold tracking-tight flex items-center mb-2">
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="4 17 10 11 4 5"></polyline>
              <line x1="12" y1="19" x2="20" y2="19"></line>
            </svg>
            Client Development
          </h2>
          <p className="text-sm">
            The{' '}
            <Link
              href={links.CLI}
              className="no-underline border-b border-gray-500 hover:border-gray-400"
            >
              CLI
            </Link>{' '}
            runs cannonfiles locally. Protocol engineers can publish development
            versions of their protocols, allowing for parallel, iterative
            development of off-chain integrations like user interfaces and bots.
          </p>
        </div>

        <div className="rounded-lg border border-border p-5">
          <h2 className="scroll-m-20 text-xl lg:text-2xl font-semibold tracking-tight flex items-center mb-2">
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            Automated Testing
          </h2>
          <p className="text-sm">
            Packages can be tested prior to deployment to ensure implementations
            are robust. Continuous integration pipelines can integrate with
            Cannon to create and maintain sophisticated end-to-end testing
            scenarios.
          </p>
        </div>

        <div className="rounded-lg border border-border p-5">
          <h2 className="scroll-m-20 text-xl lg:text-2xl font-semibold tracking-tight flex items-center mb-2">
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="16 12 12 8 8 12"></polyline>
              <line x1="12" y1="16" x2="12" y2="8"></line>
            </svg>
            IaC for Protocols
          </h2>
          <p className="text-sm">
            When protocols are ready for deployment, the same cannonfiles used
            during development can be built on live networks. Cannon also
            enables a{' '}
            <Link
              href="https://github.com/Synthetixio/synthetix-deployments"
              className="no-underline border-b border-gray-500 hover:border-gray-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitOps workflow
            </Link>{' '}
            for managing configurable/upgradable protocols.
          </p>
        </div>
      </div>

      <div className="flex justify-center py-24 lg:py-32">
        <Link href={links.GETSTARTED}>
          <Button
            className="font-miriam uppercase tracking-[0.5px] font-bold"
            variant="default"
            size="lg"
          >
            Get Started
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default DocsLandingPage;
