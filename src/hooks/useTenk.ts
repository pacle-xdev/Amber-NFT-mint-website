import React from "react"
import {
  NftContractMetadata,
  SaleInfo,
  Token as RawToken,
} from "../near/contracts/tenk"
import { TENK } from "../near/contracts"
import { wallet } from "../near"
import staleData from "../../stale-data-from-build-time.json"

const account_id = wallet.getAccountId()

export type Token = RawToken & {
  media: string
}

export interface TenkData {
  contractMetadata?: NftContractMetadata
  remainingAllowance?: number
  mintRateLimit: number
  nftsForOwner: Token[]
  // nftsMinted: Token[]
  saleInfo: SaleInfo
  tokensLeft: number
  vip: boolean
}

interface ReturnedData extends TenkData {
  stale: boolean
}

// initialize calls at root of file so that first evaluation of this file causes
// calls to start, and subsequent imports of this file just use those same calls
const rpcCalls = Promise.all([
  TENK.get_sale_info(),
  TENK.nft_metadata(),
  TENK.tokens_left(),
  !account_id ? undefined : TENK.whitelisted({ account_id }),
  !account_id ? undefined : TENK.remaining_allowance({ account_id }),
  !account_id ? undefined : TENK.nft_tokens_for_owner({ account_id }),
  // !account_id ? undefined : TENK.nft_tokens({}),
  !account_id ? undefined : TENK.mint_rate_limit({ account_id }),
])

// Export utility to get data in object form, rather than array form.
// Used by gatsby-node.ts to create the stale data JSON file.
export async function rpcData(): Promise<TenkData> {
  const [
    saleInfo,
    contractMetadata,
    tokensLeft,
    vip,
    remainingAllowance,
    nftsForOwner,
    // nftsMinted,
    mintRateLimit,
  ] = await rpcCalls
  return {
    saleInfo,
    contractMetadata,
    tokensLeft,
    vip: vip ?? false,
    remainingAllowance: remainingAllowance ?? undefined,
    nftsForOwner:
      nftsForOwner?.map(nft => ({
        ...nft,
        media: new URL(
          nft.metadata?.media ?? "",
          contractMetadata.base_uri ?? ""
        ).href,
      })) ?? [],
    // nftsMinted:
    //   nftsMinted?.map(nft => ({
    //     ...nft,
    //     media: new URL(
    //       nft.metadata?.media ?? "",
    //       contractMetadata.base_uri ?? ""
    //     ).href,
    //   })) ?? [],
    mintRateLimit: mintRateLimit ?? 10,
  }
}

export default function useTenk(): ReturnedData {
  const [data, setData] = React.useState<ReturnedData>({
    ...(staleData as unknown as TenkData),
    stale: true,
  })

  React.useEffect(() => {
    rpcData().then(d => setData({ ...d, stale: false }))
  }, [])

  return data
}
