export interface CannonDeploy {
  name: string;
  chains: {
    deploy: ([string, { [k: string]: string }] | string)[];
    chainId?: number;
    port?: number;
  }[];
}

export interface DeploymentArtifact {
  abi: any[];
  address: string;
  deployTxnHash: string;
}
