//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title Subscription
 */
library Subscription {
  error PlanNotFound(uint16 planId);
  error PlanDeprecated(uint16 planId);
  error InvalidAmountOfTerms(uint32 amountOfTerms);
  error InvalidTermsAmount(uint16 minTerms, uint16 maxTerms);
  error InvalidPlanId(uint16 planId);
  error CannotDeactivateDefaultPlan(uint16 planId);
  error MembershipNotActive();
  error InsufficientCredits(uint32 availableCredits);

  bytes32 private constant _SLOT = keccak256(abi.encode("usecannon.cannon.registry.subscription"));

  /**
   * @notice The plan of a subscription. These are the ones purchased by users
   */
  struct Plan {
    /**
     * @notice The amount of the configured ERC20 token required to subscribe to
     *         the registry for a single term.
     */
    uint256 price;
    /**
     * @notice The ID of the plan
     */
    uint16 id;
    /**
     * @notice The duration of a subscription term in seconds
     *         e.g. A single term would be 30 days
     */
    uint32 duration;
    /**
     * @notice The amount of credits available per subscription term
     */
    uint32 quota;
    /**
     * @notice The minimum number of terms a user can purchase
     */
    uint16 minTerms;
    /**
     * @notice The maximum number of terms a user can purcharse in advance
     */
    uint16 maxTerms;
    /**
     * @notice Whether the plan can be purchased or not
     */
    bool active;
  }

  /**
   * @notice The membership of a user. Represents the instance of a plan for a given user
   */
  struct Membership {
    /**
     * @notice The ID of the plan the user has purchased
     */
    uint16 planId;
    /**
     * @notice The timestamp of the current term start. This gets updated when
     *         the user uses credits and we detect that an entire term has passed
     */
    uint32 activeFrom;
    /**
     * @notice The start time of the last active term
     */
    uint32 activeUntil;
    /**
     * @notice The number of credits the user has made in the current term
     */
    uint32 availableCredits;
  }

  struct Data {
    /**
     * @notice The default plan for new user memberships. This is the plan that
     *         will be used if the user does not have an active membership
     */
    uint16 defaultPlanId;
    /**
     * @notice The latest plan id that was created. This is used to generate the
     *         id for new plans incrementally
     */
    uint16 latestPlanId;
    /**
     * @notice All the plans ever created
     */
    mapping(uint16 planId => Plan plan) plans;
    /**
     * @notice All the user memberships. A user can have only one membership
     */
    mapping(address => Membership) memberships;
  }

  function load() internal pure returns (Data storage store) {
    bytes32 s = _SLOT;
    assembly {
      store.slot := s
    }
  }

  function getPlan(Data storage _self, uint16 _planId) internal view returns (Plan storage) {
    Plan storage plan = _self.plans[_planId];
    if (plan.id == 0) revert PlanNotFound(_planId);
    return plan;
  }

  function getDefaultPlan(Data storage _self) internal view returns (Plan storage) {
    return getPlan(_self, _self.defaultPlanId);
  }

  function setDefaultPlan(Data storage _self, uint16 _planId) internal {
    _self.defaultPlanId = _planId;
  }

  function registerPlan(
    Data storage _self,
    uint32 _termDuration,
    uint32 _quota,
    uint16 _minTerms,
    uint16 _maxTerms,
    uint256 _price
  ) internal returns (uint16) {
    if (_minTerms == 0 || _maxTerms == 0 || _minTerms > _maxTerms) {
      revert InvalidTermsAmount(_minTerms, _maxTerms);
    }

    uint16 planId = _self.latestPlanId + 1;

    _self.plans[planId] = Plan({
      id: planId,
      duration: _termDuration,
      quota: _quota,
      minTerms: _minTerms,
      maxTerms: _maxTerms,
      price: _price,
      active: true
    });

    _self.latestPlanId = planId;

    return planId;
  }

  function updatePlanStatus(Data storage _self, uint16 _planId, bool _isActive) internal {
    if (!_isActive && _planId == _self.defaultPlanId) {
      revert CannotDeactivateDefaultPlan(_planId);
    }

    Plan storage _plan = getPlan(_self, _planId);
    _plan.active = _isActive;
  }

  function getMembership(Data storage _self, address _user) internal view returns (Membership storage) {
    return _self.memberships[_user];
  }

  function isMembershipActive(Membership storage _membership) internal view returns (bool) {
    // membership never created
    if (_membership.planId == 0) return false;
    // is active and on the current term
    return _membership.activeUntil > block.timestamp;
  }

  function getPendingTermsCount(Plan storage _plan, Membership storage _membership) internal view returns (uint32) {
    if (block.timestamp >= _membership.activeUntil) return 0;
    return uint32((_membership.activeUntil - block.timestamp) / _plan.duration);
  }

  function resetMembership(Plan storage _plan, Membership storage _membership, uint32 _amountOfTerms) internal {
    if (_amountOfTerms > _plan.maxTerms || _amountOfTerms < _plan.minTerms) {
      revert InvalidAmountOfTerms(_amountOfTerms);
    }

    uint32 _now = uint32(block.timestamp);

    _membership.planId = _plan.id;
    _membership.activeFrom = _now;
    _membership.activeUntil = _now + (_plan.duration * _amountOfTerms);
    _membership.availableCredits = _plan.quota;
  }

  function clearMembership(Membership storage _membership) internal {
    _membership.planId = 0;
    _membership.activeFrom = 0;
    _membership.activeUntil = 0;
    _membership.availableCredits = 0;
  }

  function addTermsToMembership(Plan storage _plan, Membership storage _membership, uint32 _amountOfTerms) internal {
    if (_membership.planId != _plan.id) {
      revert InvalidPlanId(_membership.planId);
    }

    // check that the user is trying to get the minimum amount of terms that
    // can be purchased
    if (_amountOfTerms < _plan.minTerms) {
      revert InvalidAmountOfTerms(_amountOfTerms);
    }

    uint32 finalTerms = getPendingTermsCount(_plan, _membership) + _amountOfTerms;

    if (finalTerms > _plan.maxTerms || _amountOfTerms < _plan.minTerms) {
      revert InvalidAmountOfTerms(_amountOfTerms);
    }

    // add the new terms to the existing membership
    _membership.activeUntil += _plan.duration * _amountOfTerms;
  }

  function acquireMembership(
    Data storage,
    Plan storage _plan,
    Membership storage _membership,
    uint32 _amountOfTerms
  ) internal {
    if (_amountOfTerms == 0) {
      revert InvalidAmountOfTerms(_amountOfTerms);
    }

    // if the plan is disabled no new memberships can be purchased
    if (!_plan.active) {
      revert PlanDeprecated(_plan.id);
    }

    // first time getting a membership or the previous membership has expired
    if (_membership.planId == 0) {
      resetMembership(_plan, _membership, _amountOfTerms);
    } else {
      // if the membership is still active, we will add the new terms to it
      // otherwise we will restart the membership
      if (isMembershipActive(_membership)) {
        addTermsToMembership(_plan, _membership, _amountOfTerms);
      } else {
        resetMembership(_plan, _membership, _amountOfTerms);
      }
    }
  }

  function useMembershipCredits(
    Data storage,
    Plan storage _plan,
    Membership storage _membership,
    uint32 _amountOfCredits
  ) internal {
    if (!isMembershipActive(_membership)) {
      revert MembershipNotActive();
    }

    // the last time credits were used is before the current term, so we reset
    // the credits for the current term
    if (_membership.activeFrom + _plan.duration < block.timestamp) {
      uint32 _pendingTerms = getPendingTermsCount(_plan, _membership);
      _membership.activeFrom = _membership.activeUntil - (_plan.duration * (_pendingTerms + 1));
      _membership.availableCredits = _plan.quota;
    }

    if (_membership.availableCredits < _amountOfCredits) {
      revert InsufficientCredits(_membership.availableCredits);
    }

    _membership.availableCredits -= _amountOfCredits;
  }
}
