case $1 in
  1)
    CANNON_E2E=true $CANNON publishers package-one --add 0x000000000000000000000000000000000000dEaD --optimism --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
    ;;
  2)
    CANNON_E2E=true $CANNON publishers package-one --remove 0x000000000000000000000000000000000000dEaD --optimism --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
    ;;
  3)
    CANNON_E2E=true $CANNON publishers package-one --add 0x000000000000000000000000000000000000dEaD --mainnet --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
    ;;
  4)
    CANNON_E2E=true $CANNON publishers package-one --remove 0x000000000000000000000000000000000000dEaD --mainnet --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
    ;;
  5)
    CANNON_E2E=true $CANNON publishers package-one --list
    ;;
esac
