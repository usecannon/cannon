export interface CannonDeploy {
  name: string
  chains: {
    deploy: ([string, {[k: string]: string} ]|string)[]
    chainId: number,
    port: number
  }[]
}
