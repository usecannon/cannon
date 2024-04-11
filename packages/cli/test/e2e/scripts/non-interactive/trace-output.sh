traceResult=$($CANNON trace synthetix-omnibus:3.3.5-2@andromeda --chain-id 8453 0xb4fd9973944ea7de9815bfb950b4fc1640f3f4ea3505e6aa8a10de0581e4495e)

[[ "$traceResult" =~ "CollateralConfigurationModule.configureCollateral" ]]
[[ "$traceResult" =~ "Transaction completes successfully" ]]