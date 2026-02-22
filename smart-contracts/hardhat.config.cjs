require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: __dirname + '/../.env.local' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    monadDevnet: {
      url: process.env.MONAD_RPC_URL || "https://monad-testnet.drpc.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10143,
      type: "http",
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      type: "http",
    },
  },
};
