import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
import "@nomicfoundation/hardhat-ethers";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

/** @type {import('hardhat/config').HardhatUserConfig} */
export default {
  plugins: [hardhatEthers],
  solidity: "0.8.24",
  networks: {
    amoy: {
      type: "http",
      url: process.env.POLYGON_RPC_URL || "https://rpc-amoy.polygon.technology/",
      chainId: 80002,
      accounts: process.env.POLYGON_PRIVATE_KEY ? [process.env.POLYGON_PRIVATE_KEY] : [],
    },
  },
};
