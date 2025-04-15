//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OwnableStorage} from "@synthetixio/core-contracts/contracts/ownership/OwnableStorage.sol";
import {ERC2771Context} from "./ERC2771Context.sol";
import {Subscription} from "./storage/Subscription.sol";

/**
 * @title Management of Subscriptions to Cannon Registry
 */
contract CannonSubscription is ReentrancyGuard {
  using Subscription for Subscription.Data;

  error ZeroAddressNotAllowed(string variableName);
  error InsufficientAllowance(address user, uint256 allowance, uint256 required);
  error TransferFailed(address from, address to, uint256 amount);
  error PriceOverflow();
  error MembershipNotActive(address user);

  event PlanRegistered(
    uint16 indexed planId,
    uint32 termDuration,
    uint32 quota,
    uint16 minTerms,
    uint16 maxTerms,
    uint256 price
  );
  event PlanSetAsDefault(uint16 indexed planId);
  event CreditsUsed(address indexed user, uint32 creditsUsed, uint32 remainingCredits);
  event MembershipPurchased(address indexed user, uint32 amountOfTerms, uint256 totalPrice);
  event MembershipCancelled(address indexed user, uint32 pendingTerms, uint256 reimbursement);

  IERC20 public immutable USDC;
  address public immutable VAULT;

  constructor(address _usdcAddress, address _vaultAddress) {
    if (_usdcAddress == address(0)) revert ZeroAddressNotAllowed("usdcAddress");
    if (_vaultAddress == address(0)) revert ZeroAddressNotAllowed("vaultAddress");

    USDC = IERC20(_usdcAddress);
    VAULT = _vaultAddress;
  }

  function getPlan(uint16 _planId) external view returns (Subscription.Plan memory) {
    return Subscription.load().getPlan(_planId);
  }

  function getDefaultPlan() external view returns (Subscription.Plan memory) {
    return Subscription.load().getDefaultPlan();
  }

  function registerPlan(
    uint32 _termDuration,
    uint32 _quota,
    uint16 _minTerms,
    uint16 _maxTerms,
    uint256 _price
  ) external returns (uint16) {
    OwnableStorage.onlyOwner();

    uint16 planId = Subscription.load().registerPlan(_termDuration, _quota, _minTerms, _maxTerms, _price);
    emit PlanRegistered(planId, _termDuration, _quota, _minTerms, _maxTerms, _price);

    return planId;
  }

  function setDefaultPlan(uint16 _planId) external {
    OwnableStorage.onlyOwner();
    Subscription.load().setDefaultPlan(_planId);
    emit PlanSetAsDefault(_planId);
  }

  function updatePlanStatus(uint16 _planId, bool _isActive) external {
    OwnableStorage.onlyOwner();
    Subscription.load().updatePlanStatus(_planId, _isActive);
  }

  function getMembership(address _user) external view returns (Subscription.Membership memory) {
    return Subscription.load().getMembership(_user);
  }

  function purchaseMembership(uint32 _amountOfTerms) external nonReentrant {
    address _sender = ERC2771Context.msgSender();
    Subscription.Data storage _subscription = Subscription.load();

    Subscription.Membership storage _membership = _subscription.getMembership(_sender);
    Subscription.Plan storage _plan = _membership.planId == 0
      ? _subscription.getDefaultPlan()
      : _subscription.getPlan(_membership.planId);

    uint256 _totalPrice = _plan.price * _amountOfTerms;

    if (_totalPrice / _amountOfTerms != _plan.price) {
      revert PriceOverflow();
    }

    uint256 _allowance = USDC.allowance(_sender, VAULT);
    if (_allowance < _totalPrice) {
      revert InsufficientAllowance(_sender, _allowance, _totalPrice);
    }

    _subscription.acquireMembership(_plan, _membership, _amountOfTerms);

    bool _success = USDC.transferFrom(_sender, VAULT, _totalPrice);
    if (!_success) {
      revert TransferFailed(_sender, VAULT, _totalPrice);
    }

    emit MembershipPurchased(_sender, _amountOfTerms, _totalPrice);
  }

  function hasActiveMembership(address _user) external view returns (bool) {
    Subscription.Data storage _subscription = Subscription.load();
    Subscription.Membership storage _membership = _subscription.getMembership(_user);
    return Subscription.isMembershipActive(_membership);
  }

  function useMembershipCredits(uint32 _amountOfCredits) external {
    address _sender = ERC2771Context.msgSender();
    Subscription.Data storage _subscription = Subscription.load();
    Subscription.Membership storage _membership = _subscription.getMembership(_sender);
    Subscription.Plan storage _plan = _subscription.getPlan(_membership.planId);
    _subscription.useMembershipCredits(_plan, _membership, _amountOfCredits);
    emit CreditsUsed(_sender, _amountOfCredits, _membership.availableCredits);
  }

  function cancelMembership() external nonReentrant {
    address _sender = ERC2771Context.msgSender();
    Subscription.Data storage _subscription = Subscription.load();
    Subscription.Membership storage _membership = _subscription.getMembership(_sender);

    if (!Subscription.isMembershipActive(_membership)) {
      revert MembershipNotActive(_sender);
    }

    Subscription.Plan storage _plan = _subscription.getPlan(_membership.planId);

    uint32 _pendingTerms = Subscription.getPendingTermsCount(_plan, _membership);

    if (_pendingTerms == 0) {
      revert MembershipNotActive(_sender);
    }

    Subscription.clearMembership(_membership);

    uint256 _reimbursement = _plan.price * _pendingTerms;

    bool _success = USDC.transferFrom(VAULT, _sender, _reimbursement);
    if (!_success) {
      revert TransferFailed(_sender, VAULT, _reimbursement);
    }

    emit MembershipCancelled(_sender, _pendingTerms, _reimbursement);
  }
}
