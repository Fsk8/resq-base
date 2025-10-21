// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ResQCircle.sol";

contract ResQFactory {
    event CircleCreated(address indexed creator, address circle, address token, uint256 minContribution);
    address[] public allCircles;

    // Función original (mantener para compatibilidad)
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

    // NUEVA FUNCIÓN PÚBLICA para el Frontend
    function createCirclePublic(
        address token,
        uint256 minContribution,
        uint48 voteDuration,
        uint16 quorumBps,
        uint16 approveBps,
        uint16 maxPayoutPerClaimBps
    ) external returns (address circle) {
        // Validaciones adicionales para seguridad
        require(token != address(0), "Token address cannot be zero");
        require(minContribution > 0, "Min contribution must be greater than 0");
        require(voteDuration > 0, "Vote duration must be greater than 0");
        require(quorumBps <= 10000, "Quorum cannot exceed 100%");
        require(approveBps <= 10000, "Approval threshold cannot exceed 100%");
        require(maxPayoutPerClaimBps <= 10000, "Max payout cannot exceed 100%");

        // Crear el círculo - msg.sender será el admin del círculo
        ResQCircle c = new ResQCircle(
            msg.sender,  // El que llama es el admin
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