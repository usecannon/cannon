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

  /// @notice Emitted when a new plan is registered by the owner
  event PlanRegistered(
    uint16 indexed planId,
    uint32 termDuration,
    uint32 quota,
    uint16 minTerms,
    uint16 maxTerms,
    uint256 price
  );

  /// @notice Emitted when a plan is set as the default
  event PlanSetAsDefault(uint16 indexed planId);

  /// @notice Emitted when a user uses their membership credits
  event CreditsUsed(address indexed user, uint32 creditsUsed, uint32 remainingCredits);

  /// @notice Emitted when a user purchases a membership
  event MembershipPurchased(address indexed user, uint32 amountOfTerms, uint256 totalPrice);

  /// @notice Emitted when a user cancels their membership
  event MembershipCancelled(address indexed user, uint32 pendingTerms, uint256 reimbursement);

  /// @notice Emitted when a custom plan is set for a user
  event CustomPlanSet(address indexed user, uint16 planId);

  /// @notice The token that is used to pay for the subscription
  IERC20 public immutable TOKEN;

  /// @notice The address of the vault that receives users payments
  address public immutable VAULT;

  constructor(address _paymentTokenAddress, address _vaultAddress) {
    if (_paymentTokenAddress == address(0)) revert ZeroAddressNotAllowed("_paymentTokenAddress");
    if (_vaultAddress == address(0)) revert ZeroAddressNotAllowed("_vaultAddress");

    TOKEN = IERC20(_paymentTokenAddress);
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

  function setCustomPlan(address _user, uint16 _planId) external {
    OwnableStorage.onlyOwner();
    Subscription.load().setCustomPlan(_user, _planId);
    emit CustomPlanSet(_user, _planId);
  }

  function getCustomPlan(address _user) external view returns (uint16) {
    return Subscription.load().getCustomPlan(_user);
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

    _purchaseMembership(_subscription, _plan, _membership, _sender, _amountOfTerms);
  }

  function purchaseCustomMembership(uint32 _amountOfTerms) external nonReentrant {
    address _sender = ERC2771Context.msgSender();
    Subscription.Data storage _subscription = Subscription.load();

    Subscription.Membership storage _membership = _subscription.getMembership(_sender);
    uint16 _planId = _subscription.getCustomPlan(_sender);
    Subscription.Plan storage _plan = _subscription.getPlan(_planId);

    _purchaseMembership(_subscription, _plan, _membership, _sender, _amountOfTerms);
  }

  function _purchaseMembership(
    Subscription.Data storage _subscription,
    Subscription.Plan storage _plan,
    Subscription.Membership storage _membership,
    address _user,
    uint32 _amountOfTerms
  ) internal {
    uint256 _totalPrice = _plan.price * _amountOfTerms;

    if (_totalPrice / _amountOfTerms != _plan.price) {
      revert PriceOverflow();
    }

    uint256 _allowance = TOKEN.allowance(_user, VAULT);
    if (_allowance < _totalPrice) {
      revert InsufficientAllowance(_user, _allowance, _totalPrice);
    }

    _subscription.acquireMembership(_plan, _membership, _amountOfTerms);

    bool _success = TOKEN.transferFrom(_user, VAULT, _totalPrice);
    if (!_success) {
      revert TransferFailed(_user, VAULT, _totalPrice);
    }

    emit MembershipPurchased(_user, _amountOfTerms, _totalPrice);
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

    bool _success = TOKEN.transferFrom(VAULT, _sender, _reimbursement);
    if (!_success) {
      revert TransferFailed(_sender, VAULT, _reimbursement);
    }

    emit MembershipCancelled(_sender, _pendingTerms, _reimbursement);
  }
}
