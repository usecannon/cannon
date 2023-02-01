<template>
  <CBox>
    <CAlert
      my="8"
      status="info"
      bg="blue.800"
      borderColor="blue.700"
      borderWidth="1px"
    >
      <CAlertIcon />
      <CBox>
        If you learn better by example, take a look at the
        <CLink
          textDecoration="underline"
          isExternal
          href="https://github.com/usecannon/cannon/tree/main/packages/sample-hardhat-project"
          >Hardhat sample project</CLink
        >
        in the Cannon Monorepo.</CBox
      >
    </CAlert>

    <CHeading size="md" mb="4" mt="12">👩‍💻 Create a Cannonfile</CHeading>

    <CText mb="4"
      >Create a new Hardhat project by following the instructions
      <CLink
        textDecoration="underline"
        href="https://hardhat.org/tutorial/creating-a-new-hardhat-project"
        isExternal
      >
        here</CLink
      >.</CText
    >

    <CText mb="4">Then install the Hardhat Cannon plug-in:</CText>
    <CBox mb="8">
      <CommandPreview command="npm install hardhat-cannon" />
    </CBox>

    <CText mb="4">
      Load the plug-in at the top of your hardhat.config.js file with
      <CCode bg="blackAlpha.800" color="whiteAlpha.800"
        >require('hardhat-cannon');</CCode
      >
      or
      <CCode bg="blackAlpha.800" color="whiteAlpha.800"
        >import 'hardhat-cannon';</CCode
      >
      if your’re using Typescript.
    </CText>

    <CText mb="4">
      In the configuration file, set the default network like so:
      <CCode bg="blackAlpha.800" color="whiteAlpha.800"
        >defaultNetwork: "cannon"</CCode
      >
    </CText>

    <CText mb="4"> Your project should have the following contract:</CText>

    <CBox mb="8">
      <prism-editor
        class="code-editor"
        v-model="exampleContract"
        :highlight="highlighterSolidity"
      ></prism-editor
    ></CBox>

    <CText mb="4"
      >Create a <kbd>cannonfile.toml</kbd> in the root directory of the project
      with the following contents. If you plan to publish this package, you
      should customize the name. This will deploy the contract and set the
      unlock time to 1700000000:</CText
    >

    <CBox mb="8">
      <prism-editor
        class="code-editor"
        v-model="exampleCannonfile"
        :highlight="highlighterToml"
      ></prism-editor
    ></CBox>

    <CText mb="4"
      >Now <kbd>build</kbd> the cannonfile for local development and
      testing:</CText
    >

    <CBox mb="8">
      <CommandPreview command="npx hardhat cannon:build" />
    </CBox>

    <CText mb="4">
      This created a local deployment of your nascent protocol. You can now run
      this package locally using the command-line tool:</CText
    >
    <CBox mb="8">
      <CommandPreview command="cannon sample-hardhat-project" />
    </CBox>

    <CHeading size="md" mb="4" mt="12">🚀 Deploy Your Protocol</CHeading>
    <CText mb="4"
      >Deploying is just building on a remote network! Be sure to use a network
      name that you’ve
      <CLink
        textDecoration="underline"
        href="https://hardhat.org/tutorial/deploying-to-a-live-network#deploying-to-remote-networks"
        isExternal
        >specified in your Hardhat Configuration file</CLink
      >.</CText
    >

    <CBox mb="8">
      <CommandPreview
        command="npx hardhat cannon:build --network REPLACE_WITH_NETWORK_NAME"
      />
    </CBox>

    <CText mb="4"
      >Set up the
      <CLink
        textDecoration="underline"
        href="https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan"
        isExternal
        >hardhat-etherscan plug-in</CLink
      >
      and verify your project’s contracts:</CText
    >
    <CBox mb="8">
      <CommandPreview command="npx hardhat cannon:verify" />
    </CBox>

    <CText mb="4"
      >Finally, publish your package on the
      <CLink as="nuxt-link" to="/search" textDecoration="underline"
        >Cannon registry</CLink
      >:</CText
    >
    <CBox mb="8">
      <CommandPreview
        command="npx hardhat cannon:publish --private-key REPLACE_WITH_KEY_THAT_HAS_ETH_ON_MAINNET"
      />
    </CBox>

    <CText mb="4"
      ><strong>Great work!</strong> Check out the
      <CLink
        as="nuxt-link"
        to="/docs/technical-reference"
        textDecoration="underline"
        >technical reference</CLink
      >
      for more information about the command-line tool and the actions you can
      define in a Cannonfile.</CText
    >

    <ImportProvision />

    <CHeading size="md" mb="4" mt="12">🧪 Test Your Protocol</CHeading>

    <CText mb="4"
      >At the beginning of your tests, run the build and inspect command to
      generate the addresses and ABIs:</CText
    >
    <CBox mb="8">
      <prism-editor
        class="code-editor"
        v-model="exampleTest"
        :highlight="highlighterJavascript"
      ></prism-editor
    ></CBox>

    <CText mb="4"
      >If you’re using TypeScript for your tests, Cannon's export format is
      <CLink
        textDecoration="underline"
        href="https://github.com/dethcrypto/TypeChain"
        isExternal
        >TypeChain</CLink
      >
      compatible. See the
      <CLink
        textDecoration="underline"
        href="https://github.com/Synthetixio/synthetix-v3/tree/main/protocol/synthetix/test
"
        isExternal
        >Synthetix testing suite</CLink
      >
      for an example.
    </CText>
  </CBox>
</template>

<script lang="js">
import CommandPreview from "../shared/CommandPreview"
import ImportProvision from "./ImportProvision"
// import Prism Editor
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-toml';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-solidity';
import 'prismjs/components/prism-javascript';

export default {
  name: 'HardhatGuide',
  components: {
    CommandPreview,
    PrismEditor,
    ImportProvision
  },
  methods: {
    highlighterToml(code) {
      return  highlight(code, languages.toml);
    },
    highlighterSolidity(code) {
      return  highlight(code, languages.solidity);
    },
    highlighterJavascript(code) {
      return  highlight(code, languages.javascript);
    },
  },
  created(){
    this.exampleContract = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Lock {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);

    constructor(uint _unlockTime) payable {
        require(
            block.timestamp < _unlockTime,
            "Unlock time should be in the future"
        );

        unlockTime = _unlockTime;
        owner = payable(msg.sender);
    }

    function withdraw() public {
        // Uncomment this line, and the import of "hardhat/console.sol", to print a log in your terminal
        // console.log("Unlock time is %o and block timestamp is %o", unlockTime, block.timestamp);

        require(block.timestamp >= unlockTime, "You can't withdraw yet");
        require(msg.sender == owner, "You aren't the owner");

        emit Withdrawal(address(this).balance, block.timestamp);

        owner.transfer(address(this).balance);
    }
}`
    this.exampleCannonfile = `name = "sample-hardhat-project"
version = "0.1"
description = "Sample Hardhat Project"

[setting.unlock_time]
defaultValue = "1700000000"
description="Initialization value for the unlock time"

[contract.lock]
artifact = "Lock"
args = ["<%= settings.unlock_time %>"]`
this.exampleTest = `const hre = require('hardhat');

describe('SampleTest', () => {
  let MyTestContract;
  before("load", async () => {
    await hre.run('cannon:build');
    await hre.run('cannon:inspect', { writeDeployments: './deployments' });
    let contractInfo = require(hre.config.paths.root + '/deployments/MyTestContract.json');
    myTestContract = new ethers.Contract(contractInfo.abi, contractInfo.address);
  });

  it('works', async () => {
    expect(myTestContract.greet()).to.equal('hello');
  });
});`
  }
}
</script>