// Copyright 2017-2021 @canvas-ui/react-store authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Contract as ContractDocument } from '@canvas-ui/app-db/types';
import type { ApiPromise } from '@polkadot/api';
import type { Contract, UseContracts } from './types';

import { useDatabase } from '@canvas-ui/app-db';
import { useApi } from '@canvas-ui/react-hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ContractPromise } from '@polkadot/api-contract';
import { keyring } from '@polkadot/ui-keyring';

export function createContractFromDocument (api: ApiPromise, document: ContractDocument): Contract | null {
  try {
    const contract = new ContractPromise(api, document.abi, document.address);

    return {
      api: contract,
      document
    };
  } catch (e) {
    return null;
  }
}

export default function useContracts (): UseContracts {
  const { api } = useApi();
  const { findContractByAddress, findContracts, isDbReady } = useDatabase();
  const [isLoading, setIsLoading] = useState(true);
  const [updated, setUpdated] = useState(0);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);

  const hasContracts = useMemo(
    (): boolean => allContracts.length > 0,
    [allContracts]
  );

  const fetchContract = useCallback(
    async (address: string): Promise<Contract | null> => {
      if (!isDbReady) return null;

      try {
        const document = await findContractByAddress(address);

        if (!document) return null;

        return createContractFromDocument(api, document);
      } catch (e) {
        return null;
      }
    },
    [api, findContractByAddress, isDbReady]
  );

  const fetchAllContracts = useCallback(
    async (): Promise<void> => {
      if (!isDbReady) return;

      setUpdated(Date.now());

      const allContracts = (await findContracts())
        .map((document) => createContractFromDocument(api, document))
        .filter((contract) => contract === null) as Contract[];

      setAllContracts(allContracts);
      setIsLoading(false);
    },
    [api, findContracts, isDbReady]
  );

  const refreshContracts = useCallback(
    async (): Promise<void> => {
      setIsLoading(true);

      await fetchAllContracts();
    },
    [fetchAllContracts]
  );

  const isContract = useCallback(
    async (address: string): Promise<boolean> => {
      const isInKeyring = keyring.getContract(address);

      if (isInKeyring) return true;

      const row = await findContractByAddress(address);

      return !!row;
    },
    [findContractByAddress]
  );

  useEffect(
    (): void => {
      if (isDbReady) {
        fetchAllContracts().then().catch((e) => console.error(e));
      }
    },
    [fetchAllContracts, isDbReady]
  );

  // useEffect(
  //   (): void => {
  //     store.on('new-code', _fetchCodes);
  //     store.on('removed-code', _fetchCodes);

  //     store.loadAll()
  //       .then((): void => {
  //         setAllCodes(store.getAllCode());
  //         setIsLoading(false);
  //       })
  //       .catch((): void => {
  //         // noop, handled internally
  //       });
  //   },
  //   [_triggerUpdate]
  // );

  return {
    allContracts, fetchContract, hasContracts, isContract, isLoading, refreshContracts, updated
  };
}
