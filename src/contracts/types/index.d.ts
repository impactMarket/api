/* Generated by ts-generator ver. 0.0.8 */
/* tslint:disable */

import { CommunityContract } from "./Community";

declare global {
  namespace Truffle {
    interface Artifacts {
      require(name: "Community"): CommunityContract;
    }
  }
}

export { CommunityContract, CommunityInstance } from "./Community";