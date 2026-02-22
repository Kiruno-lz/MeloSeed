import { ethers } from "hardhat";
import "@nomicfoundation/hardhat-ethers";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const MeloSeed = await ethers.getContractFactory("MeloSeed");
  const meloSeed = await MeloSeed.deploy();

  await meloSeed.waitForDeployment();
  const address = await meloSeed.getAddress();

  console.log(
    `MeloSeed deployed to ${address}`
  );

  const constantsPath = path.resolve(__dirname, "../../lib/constants.ts");
  if (fs.existsSync(constantsPath)) {
    let content = fs.readFileSync(constantsPath, "utf-8");
    const regex = /export const CONTRACT_ADDRESS = '0x[a-fA-F0-9]{40}';/;
    if (regex.test(content)) {
      content = content.replace(regex, `export const CONTRACT_ADDRESS = '${address}';`);
      fs.writeFileSync(constantsPath, content);
      console.log(`Updated CONTRACT_ADDRESS in ${constantsPath}`);
    } else {
      console.warn("Could not find CONTRACT_ADDRESS pattern in constants.ts to update.");
    }
  } else {
    console.warn(`constants.ts not found at ${constantsPath}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
