/** @format */

const { time, constants } = require('@openzeppelin/test-helpers');
const BN = require('bn.js');

const Vesting = artifacts.require('Vesting');
const Token = artifacts.require('VestingToken');

contract('Vesting', async (accounts) => {
  let instance;
  let token;

  const sender = accounts[1];
  const receiver = accounts[2];
  const sec = time.duration.seconds(2);

  beforeEach(async () => {
    instance = await Vesting.new();
    token = await Token.new();
    await token.transfer(sender, new BN(10).pow(new BN(20)));
    await token.approve(instance.address, 10 ** 10, { from: sender });
  });

  it('Should be able to initialize the Vesting Protocol constructor', async () => {
    const result = await instance.nxtStreamId();

    assert.equal(result.toNumber(), 1000, 'Wrong Value');
  });

  it('Should be to check the next streamId in the contract', async () => {
    const result = await instance.nxtStreamId();

    assert.equal(result.toNumber(), 1000, 'Wrong Value');
  });

  it('Should be able to get the stream of info from contract', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 10 ** 6, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.getStream(streamId.toNumber() - 1);
    assert.equal(result.sender, sender);
    assert.equal(result.recipient, receiver);
    assert.equal(result.tokenAddress, token.address);
    assert.equal(result.deposit.toNumber(), 1000000);
    assert(result.startTime);
    assert(result.stopTime);
    assert.equal(result.remainingBalance.toNumber(), 1000000);
    assert.equal(result.ratePerSecond.toNumber(), 1000000);
  });

  it('Should not be able to check stream info when streamId is not valid', async () => {
    try {
      const result = await instance.getStream(989);

      assert.equal(result.sender, sender);
      assert.equal(result.recipient, receiver);
      assert.equal(result.tokenAddress, token.address);
      assert.equal(result.deposit.toNumber(), 10000);
      assert(result.startTime.toNumber());
      assert(result.stopTime.toNumber());
      assert.equal(result.remainingBalance.toNumber(), 10000);
      assert.equal(result.ratePerSecond.toNumber(), 100);
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid StreamId';
      assert.equal(error.message, var_, 'Unable to get stream info.');
    }
  });

  it('Should be able to get deltaOf of stream info. from contract', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 10 ** 8, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.deltaOf(streamId.toNumber() - 1);

    assert(result);
  });

  it('Should be able to get deltaOf of stream info. from contract when stream is not started', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.deltaOf(streamId.toNumber() - 1);

    assert.equal(result.toNumber(), 0, 'Wrong Value');
  });

  it('Should be able to get deltaOf of stream info. from contract when stream is started', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(2002)), { from: sender });
    await time.increaseTo(now.add(time.duration.seconds(10)));
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.deltaOf(streamId.toNumber() - 1);

    assert(result);
  });

  it('Should be able to get deltaOf of stream info. from contract when stream is over', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    await time.increaseTo(now.add(time.duration.seconds(2)));
    const result = await instance.deltaOf.call(streamId.toNumber() - 1);

    assert.equal(result.toNumber(), 0, 'Wrong Value');
  });

  it('Should be able to check the balance of sender or receiver in Stream info.', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.balanceOf(streamId.toNumber() - 1, sender);

    assert(result.toNumber(), 'Wrong Value');
  });

  it('Should be able to check balance when who is sender address', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.balanceOf(streamId.toNumber() - 1, sender);

    assert(result.toNumber(), 'Wrong Value');
  });

  it('Should be able to check balance when who is receiver address', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.balanceOf(streamId.toNumber() - 1, receiver);

    assert(result);
  });

  it('Should be able to check balance when who is not sender nor receiver ', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.balanceOf(streamId.toNumber() - 1, accounts[3]);

    assert.equal(result.toNumber(), 0, 'Wrong Value');
  });

  it('Should be able to check balance when deposit is more than remaining balance and who is receiver', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(22)), { from: sender });
    const streamId = await instance.nxtStreamId();
    await time.increaseTo(now.add(time.duration.seconds(1000)));
    await instance.withdrawFromStream(streamId.toNumber() - 1, 10000, { from: receiver });
    await instance.withdrawFromStream(streamId.toNumber() - 1, 10000, { from: sender });
    // await instance.withdrawFromStream(streamId.toNumber() - 1, 1000, { from: receiver });
    const result = await instance.balanceOf(streamId.toNumber() - 1, receiver);

    assert(result.toNumber());
  });

  it('Should be able to check balance when deposit is more than remaining balance and who is sender', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 10 ** 4, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    await time.increaseTo(new BN(now).add(new BN(time.duration.hours(1))));
    await instance.withdrawFromStream(streamId.toNumber() - 1, 100, { from: receiver });
    await instance.withdrawFromStream(streamId.toNumber() - 1, 1, { from: sender });
    const result = await instance.balanceOf(streamId.toNumber() - 1, sender);

    assert(result);
  });

  it('Should be able to check balance when deposit is more than remaining balance and who is random address', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    await time.increaseTo(now.add(time.duration.minutes(1)));
    await instance.withdrawFromStream(streamId.toNumber() - 1, 100, { from: receiver });
    await instance.withdrawFromStream(streamId.toNumber() - 1, 10, { from: sender });
    const result = await instance.balanceOf(streamId.toNumber() - 1, accounts[3]);

    assert.equal(result.toNumber(), 0, 'Wrong Value');
  });

  it('Should be not able to check the balance when streamId is not exist', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.balanceOf(100, accounts[3]);

      assert.equal(result.toNumber(), 0, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid StreamId';
      assert.equal(error.message, var_, 'Unable to check balance');
    }
  });

  it('Should be able to create stream in Vesting Protocol contract', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId();
    const result = await instance.getStream(streamId.toNumber() - 1);

    assert(result);
  });

  it('Should not be able to create new stream when startTime is less than block.timestamp', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 100000, token.address, now - sec, now + sec * 2, { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid Start Time -- Reason given: Invalid Start Time.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when deposit amount is zero', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 0, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid Amount -- Reason given: Invalid Amount.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when token address is zero', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 100000, constants.ZERO_ADDRESS, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid Token Address -- Reason given: Invalid Token Address.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when recipient address is zero', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(constants.ZERO_ADDRESS, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid Recipient Address -- Reason given: Invalid Recipient Address.';
      assert.equal(error.message, var_, ' ');
    }
  });
  it('Should not be able to create new stream when recipient address is msg.sender', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(sender, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = "Returned error: VM Exception while processing transaction: revert Sender Can't be Recipient -- Reason given: Sender Can't be Recipient.";
      assert.equal(error.message, var_, ' ');
    }
  });
  it('Should not be able to create new stream when recipient address is contract address', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(instance.address, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = "Returned error: VM Exception while processing transaction: revert Vesting Contract Can't be Recipient -- Reason given: Vesting Contract Can't be Recipient.";
      assert.equal(error.message, var_, ' ');
    }
  });
  it('Should not be able to create new stream when duration is less or equal to zero', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(sec), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Time delta should more than zero -- Reason given: Time delta should more than zero.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when deposit amount is smaller than duration', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 1, token.address, now + sec, now + sec * 14, { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Deposit smaller than time delta -- Reason given: Deposit smaller than time delta.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when modules of deposit and duration is not zero', async () => {
    try {
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 100001, token.address, now.add(sec), now.add(time.duration.seconds(4)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Deposit is not mul of time delta -- Reason given: Deposit is not mul of time delta.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when sender does not have enough balance', async () => {
    try {
      const now = await time.latest();
      await token.transfer(accounts[4], 10 ** 8, { from: sender });
      await token.approve(instance.address, 10 ** 10, { from: accounts[4] });
      await instance.createStream(receiver, 10 ** 10, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: accounts[4] });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Sender balance is less than deposit -- Reason given: Sender balance is less than deposit.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should not be able to create new stream when Vesting Protocol does not have enough approval', async () => {
    try {
      await token.approve(instance.address, 0, { from: sender });
      const now = await time.latest();
      // await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const result = await instance.nxtStreamId();

      assert.equal(streamId, result, 'Wrong Value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert ERC20: insufficient allowance -- Reason given: ERC20: insufficient allowance.';
      assert.equal(error.message, var_, ' ');
    }
  });

  it('Should be able to withdraw from stream in Vesting Protocol contract', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 10 ** 10, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    // await time.increaseTo(now.add(sec.mul(2)));
    await time.increaseTo(now.add(time.duration.hours(15)));
    const result = await instance.withdrawFromStream.call(streamId.toNumber() - 1, 1, { from: receiver });

    assert.equal(result, true, 'Invalid return value');
  });

  it('Should be able to withdraw from stream in Vesting Protocol contract when amount equal to deposit', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 10 ** 10, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    await time.increaseTo(now.add(time.duration.hours(15)));
    const result = await instance.withdrawFromStream.call(streamId.toNumber() - 1, 10 ** 10, { from: receiver });

    assert.equal(result, true, 'Invalid return value');
  });

  it('Should not be able to withdraw from stream in Vesting Protocol when streamId is not valid', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(20))));
      const result = await instance.withdrawFromStream.call(1009, 1000, { from: receiver });

      assert.equal(result, true, 'Invalid return value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid StreamId';
      assert.equal(error.message, var_, '');
    }
  });

  it('Should not be able to withdraw from stream in Vesting Protocol when msg.sender is neither receiver nor sender', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const streamId = await instance.nxtStreamId.call();
      await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(20))));
      const result = await instance.withdrawFromStream(streamId.toNumber() - 1, 10);

      assert.equal(result, true, 'Invalid return value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid address -- Reason given: Invalid address.';
      assert.equal(error.message, var_, '');
    }
  });

  it('Should not be able to withdraw from stream in Vesting Protocol when amount is more than remaining balance', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const streamId = await instance.nxtStreamId.call();
      const result = await instance.withdrawFromStream(streamId.toNumber() - 1, 10000, { from: receiver });

      assert.equal(result, true, 'Invalid return value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Amount more than current balance -- Reason given: Amount more than current balance.';
      assert.equal(error.message, var_, '');
    }
  });

  it('Should not be able to withdraw from stream in Vesting Protocol when amount is zero', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const streamId = await instance.nxtStreamId.call();
      await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      const result = await instance.withdrawFromStream(streamId.toNumber() - 1, 0, { from: receiver });

      assert.equal(result, true, 'Invalid return value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid amount -- Reason given: Invalid amount.';
      assert.equal(error.message, var_, '');
    }
  });

  it('Should be able to cancel Stream in Vesting Protocol contract', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
    const result = await instance.cancelStream.call(streamId.toNumber() - 1, { from: sender });

    assert.equal(result, true, 'Invalid return value');
  });

  it('Should be able to cancel stream in Vesting Protocol contract when recipientBalance is zero', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now + sec * 2, now + sec * 4, { from: sender });
    const streamId = await instance.nxtStreamId.call();
    const result = await instance.cancelStream.call(streamId.toNumber() - 1, { from: receiver });

    assert.equal(result, true, 'Invalid return value');
  });

  it('Should be able to cancel stream in Vesting Protocol contract when senderBalance is zero', async () => {
    const now = await time.latest();
    await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
    const streamId = await instance.nxtStreamId.call();
    await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
    const result = await instance.cancelStream.call(streamId.toNumber() - 1, { from: sender });

    assert.equal(result, true, 'Invalid return value');
  });

  it('Should not be able to cancel stream in Vesting Protocol contract when streamId is not valid', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      const result = await instance.cancelStream(989);

      assert.equal(result, true, 'Invalid return value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid StreamId -- Reason given: Invalid StreamId.';
      assert.equal(error.message, var_, '');
    }
  });

  it('Should not be able to cancel stream in Vesting Protocol contract when msg_sender is neither sender nor receiver', async () => {
    try {
      const now = await time.latest();
      await instance.createStream(receiver, 100000, token.address, now.add(sec), now.add(time.duration.seconds(3)), { from: sender });
      const streamId = await instance.nxtStreamId.call();
      await time.increaseTo(new BN(now).add(new BN(time.duration.seconds(200))));
      const result = await instance.cancelStream(streamId.toNumber() - 1);

      assert.equal(result, true, 'Invalid return value');
    } catch (error) {
      const var_ = 'Returned error: VM Exception while processing transaction: revert Invalid address -- Reason given: Invalid address.';
      assert.equal(error.message, var_, '');
    }
  });
});
