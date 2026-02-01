require("@nomicfoundation/hardhat-ethers");
require("dotenv").config({ path: '.env.local' });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    monadDevnet: {
      url: process.env.NEXT_PUBLIC_MONAD_RPC_URL || "https://rpc-devnet.monad.xyz",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10143,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
