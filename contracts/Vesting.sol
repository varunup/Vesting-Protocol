// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

library Types {
    struct Stream {
        uint256 deposit;
        uint256 ratePerSecond;
        uint256 remainingBalance;
        uint256 startTime;
        uint256 stopTime;
        address recipient;
        address sender;
        address tokenAddress;
        bool isEntity;
    }
}

contract Vesting is Context, ReentrancyGuard {
    using SafeMath for uint256;

    uint256 public nxtStreamId;

    mapping(uint256 => Types.Stream) streams;

    modifier validStream(uint256 streamId) {
        require(streams[streamId].isEntity, "Invalid StreamId");
        _;
    }

    event CreateStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    );

    event WithdrawlFromStream(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );

    event CancelStream(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );

    constructor() {
        nxtStreamId = 1000;
    }

    function getStream(uint256 streamId)
        external
        view
        validStream(streamId)
        returns (
            address sender,
            address recipient,
            address tokenAddress,
            uint256 deposit,
            uint256 startTime,
            uint256 stopTime,
            uint256 remainingBalance,
            uint256 ratePerSecond
        )
    {
        sender = streams[streamId].sender;
        recipient = streams[streamId].recipient;
        tokenAddress = streams[streamId].tokenAddress;
        deposit = streams[streamId].deposit;
        startTime = streams[streamId].startTime;
        stopTime = streams[streamId].stopTime;
        remainingBalance = streams[streamId].remainingBalance;
        ratePerSecond = streams[streamId].ratePerSecond;
    }

    function deltaOf(uint256 streamId)
        public
        view
        validStream(streamId)
        returns (uint256 delta)
    {
        if (block.timestamp <= streams[streamId].startTime) return 0;

        if (block.timestamp < streams[streamId].stopTime)
            return block.timestamp - streams[streamId].startTime;

        return streams[streamId].stopTime - streams[streamId].startTime;
    }

    function balanceOf(uint256 streamId, address who)
        public
        view
        validStream(streamId)
        returns (uint256)
    {
        Types.Stream memory stream = streams[streamId];

        uint256 delta = deltaOf(streamId);
        uint256 balance = delta * stream.ratePerSecond;

        if (stream.deposit > stream.remainingBalance) {
            uint256 withdrawlAmount = stream.deposit - stream.remainingBalance;
            balance = balance - withdrawlAmount;
        }

        if (who == stream.sender) return stream.remainingBalance - balance;

        if (who == stream.recipient) return balance;

        return 0;
    }

    function createStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) public nonReentrant returns (uint256) {
        require(startTime > block.timestamp, "Invalid Start Time");
        require(deposit > 0, "Invalid Amount");
        require(tokenAddress != address(0), "Invalid Token Address");
        require(recipient != address(0), "Invalid Recipient Address");
        require(recipient != msg.sender, "Sender Can't be Recipient");
        require(
            recipient != address(this),
            "Vesting Contract Can't be Recipient"
        );

        uint256 duration = stopTime - startTime;

        require(duration > 0, "Time delta should more than zero");
        require(deposit >= duration, "Deposit smaller than time delta");
        require(deposit % duration == 0, "Deposit is not mul of time delta");

        IERC20 erc20 = IERC20(tokenAddress);
        uint256 bal = erc20.balanceOf(_msgSender());

        require(deposit <= bal, "Sender balance is less than deposit");

        uint256 streamId = nxtStreamId;
        uint256 ratePerSecond = deposit / duration;

        streams[streamId] = Types.Stream({
            remainingBalance: deposit,
            deposit: deposit,
            isEntity: true,
            ratePerSecond: ratePerSecond,
            recipient: recipient,
            sender: msg.sender,
            startTime: startTime,
            stopTime: stopTime,
            tokenAddress: tokenAddress
        });

        nxtStreamId = nxtStreamId + 1;

        bool result = erc20.transferFrom(_msgSender(), address(this), deposit);
        assert(result);

        emit CreateStream(
            streamId,
            _msgSender(),
            recipient,
            deposit,
            tokenAddress,
            startTime,
            stopTime
        );

        return streamId;
    }

    function withdrawFromStream(uint256 streamId, uint256 amount)
        external
        nonReentrant
        validStream(streamId)
        returns (bool)
    {
        require(
            _msgSender() == streams[streamId].recipient ||
                _msgSender() == streams[streamId].sender,
            "Invalid address"
        );
        require(amount > 0, "Invalid amount");

        Types.Stream memory stream = streams[streamId];

        uint256 balance = balanceOf(streamId, stream.recipient);

        require(balance >= amount, "Amount more than current balance");

        stream.remainingBalance = balance - amount;

        if (stream.remainingBalance == 0) {
            delete streams[streamId];
        }

        bool result = IERC20(stream.tokenAddress).transfer(
            stream.recipient,
            amount
        );
        assert(result);

        emit WithdrawlFromStream(streamId, stream.recipient, amount);

        return true;
    }

    function cancelStream(uint256 streamId)
        external
        nonReentrant
        validStream(streamId)
        returns (bool)
    {
        require(
            _msgSender() == streams[streamId].recipient ||
                _msgSender() == streams[streamId].sender,
            "Invalid address"
        );

        Types.Stream memory stream = streams[streamId];

        uint256 senderBalance = balanceOf(streamId, stream.sender);
        uint256 recipientBalance = balanceOf(streamId, stream.recipient);

        IERC20 _erc20 = IERC20(stream.tokenAddress);

        if (recipientBalance > 0)
            assert(_erc20.transfer(stream.recipient, recipientBalance));
        if (senderBalance > 0)
            assert(_erc20.transfer(stream.sender, senderBalance));

        delete streams[streamId];

        emit CancelStream(
            streamId,
            stream.sender,
            stream.recipient,
            senderBalance,
            recipientBalance
        );

        return true;
    }
}
