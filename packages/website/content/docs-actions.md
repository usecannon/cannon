## Cannonfile Steps

Cannonfiles contain a series of steps defined in a TOML file.

Each step has a type and a name. Each type accepts a specific set of inputs and modifies a return object. The return object is accessible in steps executed at later steps. The resulting return object is provided to any cannonfile that imports it with the `import` step.

⚠️ Use the depends input to specify an array of steps that a particular step relies upon. For example, you must include `depends = ["contract.myStorage"]` on an invoke step which calls a function on a contract deployed by the contract.myStorage step. Note that two steps which effect the same state need to have one depend on the other (like two transfer functions that may effect the same user balances).

Every step updates the return object by adding an entry to the `txns` key with the step’s name. The value of the entry is an object with the properties `hash` (which is the hash of this transstep) and `events` (which is an array of objects with the `name` of each event emitted by this call and the corresponding event data as `args`).

For example, the step below has the type `contract` and is named `myStorage`. It requires the input `artifact`, which is the name of the contract to deploy. (In this example, it’s the contract named `Storage`.)

```toml
[contract.myStorage]
artifact = "Storage"
```

This updates the return object such that, for example, a later `invoke` step could call this contract with the input `target = ["<%= contracts.myStorage.address %>"]`.

There are five types of steps you can use in a Cannonfile:

- The `contract` step deploys a contract.
- The `import` step will import a cannonfile from a package hosted with the package manager.
- The `invoke` step calls a specified function on your node.
- The `provision` step attempts to deploy the specified package (unlike the import command, which only injects existing deployment data). **Third-party packages can execute arbitrary code on your computer when provisioning. Only provision packages that you have verified or trust.**
- The `run` step executes a custom script. This script is passed a [ChainBuilder](https://github.com/usecannon/cannon/blob/main/packages/builder/src/builder.ts#L72) object as parameter. **The run command breaks composability. Only use this as a last resort.** Use a custom Cannon plug-in if this is necessary for your deployment.

A `setting` may also be defined, which is a user-configurable option that can be referenced in other steps’ inputs. For example, a cannonfile may define `[setting.sampleSetting]` and then reference `sampleValue` as `"<%= settings.sampleSetting %>"` after running `npx hardhat cannon sampleSetting="sampleValue"`
