import { ethers } from "hardhat";

async function main() {
  const MeloSeed = await ethers.getContractFactory("MeloSeed");
  const meloSeed = await MeloSeed.deploy();

  await meloSeed.waitForDeployment();

  console.log(
    `MeloSeed deployed to ${await meloSeed.getAddress()}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
