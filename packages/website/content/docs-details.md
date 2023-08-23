## Advanced Usage

### Referencing Factory-deployed Contracts

Smart contracts may have functions which deploy other smart contracts. Contracts which deploy others are typically referred to as factory contracts. You can reference contracts deployed by factories in your cannonfile.

For example, if the `deployPool` function below deploys a contract, the following invoke command registers that contract based on event data emitted from that call.

```toml
[invoke.deployment]
target = ["PoolFactory"]
func = "deployPool"
factory.MyPoolDeployment.artifact = "Pool"
# alternatively, if the code for the deployed contract is not available in your artifacts, you can also reference the ABI like:
# factory.MyPoolDeployment.abiOf = "PreviousPool"
factory.MyPoolDeployment.event = "NewDeployment"
factory.MyPoolDeployment.arg = 0
```

Specifically, this would anticipate this invoke call will emit an event named _NewDeployment_ with a contract address as the first data argument (per `arg`, a zero-based index). This contract should implement the `Pool` contract. Now, a subsequent `invoke` step could set `target = ["MyPoolDeployment"]`.

To reference contract information for a contract deployed on a previous invoke step such as the example shown above call the `contracts` object inside your cannonfile.
For example `<%= contracts.MyPoolDeployment.address %>` would return the address of the `Pool` contract deployed by the `PoolFactory` contract.

If the invoked function deploys multiple contracts of the same name, you can specify them by index through the `contracts` object.

- `<%= contracts.MyPoolDeployment.address %>` would return the first deployed `Pool` contract address
- `<%= contracts.MyPoolDeployment_0.address %>` would return the second deployed `Pool` contract address

These contracts are added to the return object as they would be if deployed by a `contract` step.

### Referencing Extra Event Data

If an invoked function emits an event, cannon can parse the event data in your cannonfile by using the `extras` property,
This lets you reference previously emitted event's data in subsequent `invoke` steps.

For example, to track the _NewDeployment_ event data from the `PoolFactory` deployment from the example above, add the `extra` property and set an attribute
for the event like so:

```toml
[invoke.deployment]
target = ["PoolFactory"]
....

extra.NewDeploymentEvent.event = "NewDeployment"
extra.NewDeploymentEvent.arg = 0
```

Now, calling `"<% = extras.NewDeploymentEvent %>"` in a subsequent `invoke` step would return the first data argument for _NewDeployment_.

If an invoked function emits multiple events you can specify them by index.

For example if the `PoolFactory` emitted multiple _NewDeployment_ events:

- `<%= extras.NewDeploymentEvent_0 %>` would return the first emitted event of this kind
- `<% = extras.NewDeploymentEvent_4 %>` would reference the fifth emitted event of this kind

### Event Error Logging

If an event is specified in the cannonfile but the `invoke` function does not emit any events or emits an event that doesn't match the one specified in the cannonfile, the `invoke` step will fail with an error.

You can bypass the event error logging by setting it like `extras.NewDeploymentEvent.allowEmptyEvents = true` or `factory.MyPoolDeployment.allowEmptyEvents = true` under the factory or extra property that throws an error.

An useful example would for this would be when an event is only emitted under certain conditions but you still need to reference it when it is emitted or don't want to halt execution when it's not emitted.

**Keep in mind you wont be able to reference event or contract data through the `contracts` or `extras` properties if a matching event wasnt emitted**
