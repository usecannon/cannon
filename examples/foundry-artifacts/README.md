# Cannon | Foundry Artifacts Example

Example showing how to import external artifacts from a foundry project.

The keypoints to take into account in this example are:

1. Have the dependencies installed using any dependency manager (here we are using `npm` and installed `@openzeppelin/contracts`), but [forge dependencies](https://book.getfoundry.sh/projects/dependencies) are also supported.
2. Optionally, you can add remappings to your `foundry.toml`. In this case `remappings = ["@openzeppelin/=node_modules/@openzeppelin/"]`
3. Create a `Dependencies.sol` file that will be used to include external dependencies in your project. This means that they will be compiled when running `forge build`.
4. After this, you can directly include the dependencies in your `cannonfile.toml` using the `artifact` field, e.g:

```
 [contract.AccessManager]
 artifact = "AccessManager"
 args = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]
```
