// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ResQCircle.sol";

/**
 * @title ResQFactory
 * @notice Despliega nuevos círculos ResQ y emite eventos para indexar.
 */
contract ResQFactory {
    event CircleCreated(address indexed creator, address circle, address token, uint256 minContribution);

    address[] public allCircles;

    // Conserva tu función original
    function createCircle(
        address token,
        uint256 minContribution,
        uint48 voteDuration,
        uint16 quorumBps,
        uint16 approveBps,
        uint16 maxPayoutPerClaimBps
    ) external returns (address circle) {
        ResQCircle c = new ResQCircle(
            msg.sender,
            token,
            minContribution,
            voteDuration,
            quorumBps,
            approveBps,
            maxPayoutPerClaimBps
        );
        circle = address(c);
        allCircles.push(circle);
        emit CircleCreated(msg.sender, circle, token, minContribution);
    }

    // Conveniencia para frontend
    function createCirclePublic(
        address token,
        uint256 minContribution,
        uint48 voteDuration,
        uint16 quorumBps,
        uint16 approveBps,
        uint16 maxPayoutPerClaimBps
    ) external returns (address circle) {
        require(token != address(0), "Token address cannot be zero");
        require(minContribution > 0, "Min contribution must be greater than 0");
        require(voteDuration > 0, "Vote duration must be greater than 0");
        require(quorumBps <= 10000, "Quorum cannot exceed 100%");
        require(approveBps <= 10000, "Approval threshold cannot exceed 100%");
        require(maxPayoutPerClaimBps <= 10000, "Max payout cannot exceed 100%");

        ResQCircle c = new ResQCircle(
            msg.sender,  // admin del círculo
            token,
            minContribution,
            voteDuration,
            quorumBps,
            approveBps,
            maxPayoutPerClaimBps
        );

        circle = address(c);
        allCircles.push(circle);
        emit CircleCreated(msg.sender, circle, token, minContribution);
        return circle;
    }

    function circlesCount() external view returns (uint256) {
        return allCircles.length;
    }
}
