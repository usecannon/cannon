export interface CannonDeploy {
  name: string
  chains: {
    deploy: string[]
    chainId: number
  }[]
}
