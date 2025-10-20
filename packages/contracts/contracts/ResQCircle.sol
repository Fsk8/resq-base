// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ResQCircle is ReentrancyGuard {
    address public immutable admin;
    IERC20  public immutable token;
    uint256 public immutable minContribution;
    uint48  public immutable voteDuration;
    uint16  public immutable quorumBps;
    uint16  public immutable approveBps;
    uint16  public immutable maxPayoutPerClaimBps;

    uint256 public totalMembers;
    uint256 public totalContributed;
    mapping(address => bool) public isMember;

    struct Claim {
        address claimant;
        string  evidence;
        uint256 amountRequested;
        uint48  startTime;
        uint48  endTime;
        uint32  yesVotes;
        uint32  noVotes;
        bool    finalized;
        bool    paid;
        mapping(address => bool) voted;
    }
    Claim[] private _claims;

    event Joined(address indexed member, uint256 amount);
    event Contributed(address indexed member, uint256 amount);
    event ClaimOpened(uint256 indexed claimId, address indexed claimant, uint256 amountRequested, string evidence);
    event Voted(uint256 indexed claimId, address indexed voter, bool support);
    event ClaimFinalized(uint256 indexed claimId, bool paid, uint256 amountPaid);

    modifier onlyMember() {
        require(isMember[msg.sender], "not member");
        _;
    }

    constructor(
        address _admin,
        address _token,
        uint256 _minContribution,
        uint48  _voteDuration,
        uint16  _quorumBps,
        uint16  _approveBps,
        uint16  _maxPayoutPerClaimBps
    ) {
        require(_admin != address(0) && _token != address(0), "zero addr");
        require(_approveBps <= 10000 && _quorumBps <= 10000 && _maxPayoutPerClaimBps <= 10000, "bps>100%");
        admin = _admin;
        token = IERC20(_token);
        minContribution = _minContribution;
        voteDuration = _voteDuration;
        quorumBps = _quorumBps;
        approveBps = _approveBps;
        maxPayoutPerClaimBps = _maxPayoutPerClaimBps;
    }

    function joinAndContribute(uint256 amount) external nonReentrant {
        require(amount >= minContribution, "min contribution");
        if (!isMember[msg.sender]) {
            isMember[msg.sender] = true;
            totalMembers += 1;
            emit Joined(msg.sender, amount);
        }
        _contribute(amount);
    }

    function contribute(uint256 amount) external onlyMember nonReentrant {
        require(amount > 0, "amount=0");
        _contribute(amount);
    }

    function _contribute(uint256 amount) internal {
        totalContributed += amount;
        require(token.transferFrom(msg.sender, address(this), amount), "transferFrom fail");
        emit Contributed(msg.sender, amount);
    }

    function balance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function openClaim(string calldata evidenceCID, uint256 amountRequested) external onlyMember returns (uint256 claimId) {
        require(bytes(evidenceCID).length > 0, "no evidence");
        require(amountRequested > 0, "amount=0");
        claimId = _claims.length;
        Claim storage c = _claims.push();
        c.claimant = msg.sender;
        c.evidence = evidenceCID;
        c.amountRequested = amountRequested;
        c.startTime = uint48(block.timestamp);
        c.endTime = uint48(block.timestamp + voteDuration);
        emit ClaimOpened(claimId, msg.sender, amountRequested, evidenceCID);
    }

    function getClaim(uint256 claimId) external view returns (
        address claimant,
        string memory evidence,
        uint256 amountRequested,
        uint48 startTime,
        uint48 endTime,
        uint32 yesVotes,
        uint32 noVotes,
        bool finalized,
        bool paid
    ) {
        Claim storage c = _claims[claimId];
        return (c.claimant, c.evidence, c.amountRequested, c.startTime, c.endTime, c.yesVotes, c.noVotes, c.finalized, c.paid);
    }

    function claimsCount() external view returns (uint256) {
        return _claims.length;
    }

    function vote(uint256 claimId, bool support) external onlyMember {
        Claim storage c = _claims[claimId];
        require(block.timestamp < c.endTime, "voting closed");
        require(!c.voted[msg.sender], "already voted");
        c.voted[msg.sender] = true;
        if (support) c.yesVotes += 1; else c.noVotes += 1;
        emit Voted(claimId, msg.sender, support);
    }

    function finalizeClaim(uint256 claimId) external nonReentrant {
        Claim storage c = _claims[claimId];
        require(block.timestamp >= c.endTime, "still voting");
        require(!c.finalized, "already finalized");
        c.finalized = true;

        uint32 totalVotes = c.yesVotes + c.noVotes;
        bool hasQuorum = totalMembers > 0
            ? uint256(totalVotes) * 10000 >= uint256(totalMembers) * quorumBps
            : false;

        bool approved = totalVotes > 0
            ? uint256(c.yesVotes) * 10000 >= uint256(totalVotes) * approveBps
            : false;

        uint256 amountPaid = 0;
        if (hasQuorum && approved) {
            uint256 maxPayout = (balance() * maxPayoutPerClaimBps) / 10000;
            uint256 toPay = c.amountRequested > maxPayout ? maxPayout : c.amountRequested;
            if (toPay > 0) {
                require(token.transfer(c.claimant, toPay), "transfer fail");
                c.paid = true;
                amountPaid = toPay;
            }
        }

        emit ClaimFinalized(claimId, c.paid, amountPaid);
    }
}
