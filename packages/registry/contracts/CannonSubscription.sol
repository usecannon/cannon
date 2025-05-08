//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OwnableStorage} from "@synthetixio/core-contracts/contracts/ownership/OwnableStorage.sol";
import {Ownable} from "@synthetixio/core-contracts/contracts/ownership/Ownable.sol";
import {ERC2771Context} from "./ERC2771Context.sol";
import {Subscription} from "./storage/Subscription.sol";

/**
 * @title Management of Subscriptions to Cannon Registry
 */
contract CannonSubscription is ReentrancyGuard, Ownable {
  using Subscription for Subscription.Data;

  error ZeroAddressNotAllowed(string variableName);
  error InsufficientAllowance(address user, uint256 allowance, uint256 required);
  error TransferFailed(address from, address to, uint256 amount);
  error PriceOverflow();
  error MembershipNotActive(address user);
  error NoTermToCancel(address user);
  error PlanNotAvailable(address user, uint16 planId);
  error InvalidAmountOfTerms(uint32 amountOfTerms);
  error CreditConsumerExhausted(address consumer, uint256 requiredCredits, uint256 remainingCredits);


  /// @notice Emitted when a new plan is registered by the owner
  event PlanRegistered(
    uint16 indexed planId,
    uint32 termDuration,
    uint32 quota,
    uint16 minTerms,
    uint16 maxTerms,
    uint256 price
  );

  /// @notice Emitted when the available plans are changed
  event AvailablePlansChanged(uint16[] planId);

  /// @notice Emitted when a user uses their membership credits
  event CreditsUsed(address indexed user, uint32 creditsUsed, uint32 remainingCredits);

  /// @notice Emitted when a user purchases a membership
  event MembershipPurchased(address indexed user, uint16 indexed planId, uint32 amountOfTerms, uint256 totalPrice);

  /// @notice Emitted when a user purchases a membership
  event MembershipGifted(address indexed user, uint16 indexed planId, uint32 amountOfTerms);

  /// @notice Emitted when a user cancels their membership
  event MembershipCancelled(address indexed user, uint32 pendingTerms, uint256 reimbursement);

  /// @notice Emitted when a custom plans are set for a user
  event CustomPlansSet(address indexed user, uint16[] planIds);

  /// @notice Emitted on call to allocateCreditConsumer
  event AllocatedCreditConsumer(address indexed consumer, uint256 newlyAllocatedCredits, uint256 totalAllocatedCredits);

  /// @notice The token that is used to pay for the subscription
  IERC20 public immutable TOKEN;

  /// @notice The address of the vault that receives users payments
  address public immutable VAULT;

  constructor(address _paymentTokenAddress, address _vaultAddress) Ownable(msg.sender) {
    if (_paymentTokenAddress == address(0)) revert ZeroAddressNotAllowed("_paymentTokenAddress");
    if (_vaultAddress == address(0)) revert ZeroAddressNotAllowed("_vaultAddress");

    TOKEN = IERC20(_paymentTokenAddress);
    VAULT = _vaultAddress;
  }

  function getPlan(uint16 _planId) external view returns (Subscription.Plan memory) {
    return Subscription.load().getPlan(_planId);
  }

  function registerPlan(
    uint32 _termDuration,
    uint32 _quota,
    uint16 _minTerms,
    uint16 _maxTerms,
    uint256 _price,
    bool _refundable
  ) external returns (uint16) {
    OwnableStorage.onlyOwner();

    uint16 planId = Subscription.load().registerPlan(
      _termDuration,
      _quota,
      _minTerms,
      _maxTerms,
      _price,
      _refundable
    );

    emit PlanRegistered(planId, _termDuration, _quota, _minTerms, _maxTerms, _price);

    return planId;
  }

  function setAvailablePlans(uint16[] memory _availablePlans) external {
    OwnableStorage.onlyOwner();
    Subscription.load().availablePlanIds = _availablePlans;
    emit AvailablePlansChanged(_availablePlans);
  }

  function setCustomPlans(address _user, uint16[] memory _planIds) external {
    OwnableStorage.onlyOwner();
    Subscription.load().setCustomPlans(_user, _planIds);
    emit CustomPlansSet(_user, _planIds);
  }

  function getCustomPlans(address _user) external view returns (uint16[] memory) {
    return Subscription.load().getCustomPlans(_user);
  }

  function updatePlanStatus(uint16 _planId, bool _isActive) external {
    OwnableStorage.onlyOwner();
    Subscription.load().updatePlanStatus(_planId, _isActive);
  }

  function getMembership(address _user) external view returns (Subscription.Membership memory) {
    return Subscription.load().getMembership(_user);
  }

  function giftMembership(address _user, uint16 _planId, uint32 _amountOfTerms) external {
    OwnableStorage.onlyOwner();
    Subscription.Data storage _subscription = Subscription.load();

    Subscription.Membership storage _membership = _subscription.getMembership(_user);
    Subscription.Plan storage _plan = _subscription.getPlan(_planId);

    _subscription.acquireMembership(_plan, _membership, _amountOfTerms);
    
    emit MembershipGifted(_user, _planId, _amountOfTerms);
  }

  function purchaseMembership(uint16 _planId, uint32 _amountOfTerms) external nonReentrant {
    address _sender = ERC2771Context.msgSender();
    Subscription.Data storage _subscription = Subscription.load();

    if (_amountOfTerms == 0) {
      revert InvalidAmountOfTerms(_amountOfTerms);
    }

    if (!_subscription.isAvailablePlan(_sender, _planId)) {
      revert PlanNotAvailable(_sender, _planId);
    }

    Subscription.Membership storage _membership = _subscription.getMembership(_sender);
    Subscription.Plan storage _plan = _subscription.getPlan(_planId);

    uint256 _totalPrice = _plan.price * _amountOfTerms;

    if (_totalPrice / _amountOfTerms != _plan.price) {
      revert PriceOverflow();
    }

    uint256 _allowance = TOKEN.allowance(_sender, address(this));
    if (_allowance < _totalPrice) {
      revert InsufficientAllowance(_sender, _allowance, _totalPrice);
    }

    bool _success = TOKEN.transferFrom(_sender, VAULT, _totalPrice);
    if (!_success) {
      revert TransferFailed(_sender, VAULT, _totalPrice);
    }

    _subscription.acquireMembership(_plan, _membership, _amountOfTerms);

    emit MembershipPurchased(_sender, _planId, _amountOfTerms, _totalPrice);
  }

  function getAvailablePlans(address _user) external view returns (uint16[] memory) {
    Subscription.Data storage _subscription = Subscription.load();
    return _subscription.getAvailablePlans(_user);
  }

  function hasActiveMembership(address _user) external view returns (bool) {
    Subscription.Data storage _subscription = Subscription.load();
    Subscription.Membership storage _membership = _subscription.getMembership(_user);
    return Subscription.isMembershipActive(_membership);
  }

  function allocateCreditConsumer(address _consumer, uint256 _consumableCredits) external onlyOwner returns (uint256) {
    Subscription.Data storage _subscription = Subscription.load();

    _subscription.creditConsumers[_consumer] += _consumableCredits;

    emit AllocatedCreditConsumer(_consumer, _consumableCredits, _subscription.creditConsumers[_consumer]);

    return _subscription.creditConsumers[_consumer];
  }

  function useMembershipCredits(address _user, uint32 _amountOfCredits) external {
    Subscription.Data storage _subscription = Subscription.load();

    address _consumer = msg.sender;

    if (_subscription.creditConsumers[_consumer] < _amountOfCredits) {
      revert CreditConsumerExhausted(_consumer, _amountOfCredits, _subscription.creditConsumers[_consumer]);
    }

    _subscription.creditConsumers[_consumer] -= _amountOfCredits;

    Subscription.Membership storage _membership = _subscription.getMembership(_user);
    Subscription.Plan storage _plan = _subscription.getPlan(_membership.planId);
    _subscription.useMembershipCredits(_plan, _membership, _amountOfCredits);
    emit CreditsUsed(_user, _amountOfCredits, _membership.availableCredits);
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
      revert NoTermToCancel(_sender);
    }

    Subscription.clearMembership(_membership);

    uint256 _reimbursement = _plan.refundable ? _plan.price * _pendingTerms : 0;

    if (_reimbursement > 0) {
      bool _success = TOKEN.transferFrom(VAULT, _sender, _reimbursement);

      if (!_success) {
        revert TransferFailed(_sender, VAULT, _reimbursement);
      }
    }

    emit MembershipCancelled(_sender, _pendingTerms, _reimbursement);
  }
}
