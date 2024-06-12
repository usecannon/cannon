case $1 in
  1)
    CANNON_E2E=true DEBUG=* $CANNON register package-one --private-key ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
    ;;
  2)
    CANNON_E2E=true DEBUG=* $CANNON register package-one package-two --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --skip-confirm
esac
