import type { Abi } from "viem";
import factory from "./ResQFactory.json";
import circle from "./ResQCircle.json";
import erc20 from "./MockERC20.json";

export const RESQ_FACTORY_ABI = factory.abi as Abi;
export const RESQ_CIRCLE_ABI = circle.abi as Abi;
export const ERC20_ABI = erc20.abi as Abi;
