export { default as GetStartedFoundryGuide } from '../../components/get-started/FoundryGuide.vue'
export { default as GetStartedHardhatGuide } from '../../components/get-started/HardhatGuide.vue'
export { default as GetStartedImportProvision } from '../../components/get-started/ImportProvision.vue'
export { default as LayoutBanner } from '../../components/layout/Banner.vue'
export { default as LayoutFooter } from '../../components/layout/Footer.vue'
export { default as LayoutHeading } from '../../components/layout/Heading.vue'
export { default as HomepageHero } from '../../components/homepage/Hero.vue'
export { default as HomepageHowItWorks } from '../../components/homepage/HowItWorks.vue'
export { default as HomepageUseCases } from '../../components/homepage/UseCases.vue'
export { default as SearchCannonfile } from '../../components/search/Cannonfile.vue'
export { default as SearchInteract } from '../../components/search/Interact.vue'
export { default as SearchPreview } from '../../components/search/Preview.vue'
export { default as SearchVersions } from '../../components/search/Versions.vue'
export { default as SharedCommandPreview } from '../../components/shared/CommandPreview.vue'
export { default as SharedPackageNetworks } from '../../components/shared/PackageNetworks.vue'
export { default as SharedPublishInfo } from '../../components/shared/PublishInfo.vue'
export { default as SearchInteractAbi } from '../../components/search/Interact/Abi.vue'
export { default as SearchInteractConnectWallet } from '../../components/search/Interact/ConnectWallet.vue'
export { default as SearchInteractContract } from '../../components/search/Interact/Contract.vue'
export { default as SearchInteractContractStep } from '../../components/search/Interact/ContractStep.vue'
export { default as SearchInteractFunction } from '../../components/search/Interact/Function.vue'
export { default as SearchInteractFunctionInput } from '../../components/search/Interact/FunctionInput.vue'
export { default as SearchInteractFunctionOutput } from '../../components/search/Interact/FunctionOutput.vue'
export { default as SearchInteractCommand } from '../../components/search/Interact/InteractCommand.vue'
export { default as SearchInteractProvisionStep } from '../../components/search/Interact/ProvisionStep.vue'
export { default as SearchInteractVersionSelect } from '../../components/search/Interact/VersionSelect.vue'
export { default as SearchInteractFunctionInputAddressInput } from '../../components/search/Interact/FunctionInput/AddressInput.vue'
export { default as SearchInteractFunctionInputBoolInput } from '../../components/search/Interact/FunctionInput/BoolInput.vue'
export { default as SearchInteractFunctionInputDefaultInput } from '../../components/search/Interact/FunctionInput/DefaultInput.vue'
export { default as SearchInteractFunctionInputNumberInput } from '../../components/search/Interact/FunctionInput/NumberInput.vue'

// nuxt/nuxt.js#8607
function wrapFunctional(options) {
  if (!options || !options.functional) {
    return options
  }

  const propKeys = Array.isArray(options.props) ? options.props : Object.keys(options.props || {})

  return {
    render(h) {
      const attrs = {}
      const props = {}

      for (const key in this.$attrs) {
        if (propKeys.includes(key)) {
          props[key] = this.$attrs[key]
        } else {
          attrs[key] = this.$attrs[key]
        }
      }

      return h(options, {
        on: this.$listeners,
        attrs,
        props,
        scopedSlots: this.$scopedSlots,
      }, this.$slots.default)
    }
  }
}
