// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ResQCircle.sol";

contract ResQFactory {
    event CircleCreated(address indexed creator, address circle, address token, uint256 minContribution);
    address[] public allCircles;

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

    function circlesCount() external view returns (uint256) {
        return allCircles.length;
    }
}
