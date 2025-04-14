case $1 in
  1)
    CANNON_E2E=true $CANNON publish greeter-foundry --chain-id 1 --registry-chain-id 1 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
    ;;
  2)
    CANNON_E2E=true CANNON_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 $CANNON publish greeter-foundry --chain-id 1 --skip-confirm
    ;;
  3)
    CANNON_E2E=true CANNON_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 $CANNON publish $(cat $CANNON_DIRECTORY/tags/examples-router-architecture_latest_1-main.txt) --chain-id 1 --skip-confirm --exclude-cloned
    ;;
esac
