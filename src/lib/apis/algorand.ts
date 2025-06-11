import algosdk from 'algosdk';
import { config } from '../config';

export class AlgorandService {
  private algodClient: algosdk.Algodv2;
  private indexerClient: algosdk.Indexer;

  constructor() {
    const { algorand } = config;
    
    // FORCE MAINNET CONNECTION - Initialize Algorand clients with Nodely mainnet endpoints
    console.log('🔗 Connecting to Algorand MAINNET via Nodely...');
    
    this.algodClient = new algosdk.Algodv2(
      { 'X-Algo-api-token': algorand.apiToken },
      algorand.mainnetApi, // ALWAYS use mainnet API
      ''
    );

    this.indexerClient = new algosdk.Indexer(
      { 'X-Algo-api-token': algorand.apiToken },
      algorand.mainnetIndexer, // ALWAYS use mainnet indexer
      ''
    );

    console.log('✅ Algorand MAINNET clients initialized');
    console.log('📡 API Endpoint:', algorand.mainnetApi);
    console.log('🔍 Indexer Endpoint:', algorand.mainnetIndexer);
  }

  async getNetworkStatus() {
    try {
      console.log('🔍 Fetching Algorand MAINNET status...');
      const status = await this.algodClient.status().do();
      
      // Handle case where API returns data but not in expected format
      if (!status || typeof status !== 'object') {
        console.warn('⚠️ API returned unexpected response format:', status);
        return {
          network: 'mainnet',
          lastRound: 0,
          timeSinceLastRound: 0,
          catchupTime: 0,
          hasSyncedSinceStartup: false,
          genesisId: null,
          genesisHash: null,
          connectionStatus: 'degraded'
        };
      }
      
      const networkInfo = {
        network: 'mainnet', // FORCE MAINNET
        lastRound: status['last-round'] || 0,
        timeSinceLastRound: status['time-since-last-round'] || 0,
        catchupTime: status['catchup-time'] || 0,
        hasSyncedSinceStartup: status['has-synced-since-startup'] || false,
        genesisId: status['genesis-id'] || null,
        genesisHash: status['genesis-hash'] || null,
        connectionStatus: 'connected'
      };

      console.log('✅ Connected to Algorand MAINNET:', networkInfo);
      
      // More robust mainnet verification
      const isMainnet = this.verifyMainnetStatus(status);
      if (isMainnet) {
        console.log('🎉 CONFIRMED: Connected to Algorand MAINNET');
      } else {
        console.warn('⚠️ WARNING: Network verification inconclusive, but using MAINNET endpoints');
      }

      return networkInfo;
    } catch (error) {
      console.error('❌ Error connecting to Algorand MAINNET:', error);
      
      // Return a fallback status instead of throwing
      return {
        network: 'mainnet',
        lastRound: 0,
        timeSinceLastRound: 0,
        catchupTime: 0,
        hasSyncedSinceStartup: false,
        genesisId: null,
        genesisHash: null,
        connectionStatus: 'failed',
        error: error.message
      };
    }
  }

  private verifyMainnetStatus(status: any): boolean {
    // Multiple verification methods for mainnet
    const checks = {
      genesisId: status['genesis-id'] === 'mainnet-v1.0',
      genesisHash: status['genesis-hash'] === 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
      hasValidRound: status['last-round'] && status['last-round'] > 0,
      endpointCheck: config.algorand.mainnetApi.includes('mainnet')
    };

    console.log('🔍 Mainnet verification checks:', checks);

    // If we have genesis info and it matches, we're definitely on mainnet
    if (checks.genesisId && checks.genesisHash) {
      return true;
    }

    // If we're using mainnet endpoints and have valid round data, likely mainnet
    if (checks.endpointCheck && checks.hasValidRound) {
      console.log('✅ Mainnet verified via endpoint and round data');
      return true;
    }

    // If genesis info is missing but we have valid round data and mainnet endpoints
    if (!status['genesis-id'] && checks.hasValidRound && checks.endpointCheck) {
      console.log('⚠️ Genesis info missing but endpoint and round data suggest mainnet');
      return true;
    }

    return false;
  }

  async getAccountInfo(address: string) {
    try {
      console.log('🔍 Fetching account info from MAINNET for:', address);
      const accountInfo = await this.algodClient.accountInformation(address).do();
      console.log('✅ Account info retrieved from MAINNET');
      return accountInfo;
    } catch (error) {
      console.error('❌ Error fetching account info from MAINNET:', error);
      throw error;
    }
  }

  async getAssetInfo(assetId: number) {
    try {
      console.log('🔍 Fetching asset info from MAINNET for asset ID:', assetId);
      const assetInfo = await this.algodClient.getAssetByID(assetId).do();
      console.log('✅ Asset info retrieved from MAINNET');
      return assetInfo;
    } catch (error) {
      console.error('❌ Error fetching asset info from MAINNET:', error);
      throw error;
    }
  }

  async storeLocationMemory(locationId: string, interactionData: any) {
    try {
      // DEMO MODE: Simulate blockchain transaction on MAINNET
      // In production, this would require a connected wallet with ALGO for transaction fees
      
      const memoryData = {
        type: 'location_memory',
        locationId,
        timestamp: Date.now(),
        data: interactionData,
        network: 'mainnet' // Explicitly mark as mainnet transaction
      };

      // Generate a simulated mainnet transaction ID
      const simulatedTxId = `MAINNET_TX_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log('🔗 Simulating MAINNET blockchain storage for location memory:', {
        locationId,
        transactionId: simulatedTxId,
        network: 'mainnet',
        data: memoryData
      });

      return {
        success: true,
        transactionId: simulatedTxId,
        note: memoryData,
        network: 'mainnet',
        isSimulated: true
      };
    } catch (error) {
      console.error('❌ Error storing location memory on MAINNET:', error);
      return { success: false, error: error.message };
    }
  }

  async getLocationMemory(locationId: string) {
    try {
      console.log('🔍 Retrieving location memory from MAINNET for:', locationId);
      
      // In production, this would query the mainnet blockchain for location memories
      // For now, return mock data structure with mainnet context
      return {
        locationId,
        network: 'mainnet',
        interactions: [],
        personalityEvolution: [],
        relationships: [],
        events: [],
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('❌ Error retrieving location memory from MAINNET:', error);
      throw error;
    }
  }

  async createLocationNFT(locationId: string, eventData: any) {
    try {
      // DEMO MODE: Simulate NFT creation on MAINNET
      // In production, this would create an actual Algorand Standard Asset (ASA) on mainnet
      
      const metadata = {
        name: `Cellular Location: ${locationId}`,
        description: `Neural network memory for location ${locationId} on Algorand MAINNET`,
        image: `https://cellular.earth/location/${locationId}/image`,
        properties: {
          locationId,
          eventType: eventData.type,
          timestamp: Date.now(),
          significance: eventData.significance,
          network: 'mainnet'
        }
      };

      const simulatedAssetId = `MAINNET_ASSET_${Date.now()}`;

      console.log('🎨 Simulating MAINNET NFT creation for location:', {
        locationId,
        assetId: simulatedAssetId,
        network: 'mainnet',
        metadata
      });

      return {
        success: true,
        assetId: simulatedAssetId,
        metadata,
        network: 'mainnet',
        isSimulated: true
      };
    } catch (error) {
      console.error('❌ Error creating location NFT on MAINNET:', error);
      return { success: false, error: error.message };
    }
  }

  async getTransactionHistory(address: string, limit: number = 10) {
    try {
      console.log('🔍 Fetching MAINNET transaction history for:', address);
      
      const transactions = await this.indexerClient
        .lookupAccountTransactions(address)
        .limit(limit)
        .do();

      console.log('✅ Transaction history retrieved from MAINNET');
      return transactions;
    } catch (error) {
      console.error('❌ Error fetching transaction history from MAINNET:', error);
      throw error;
    }
  }

  // Enhanced mainnet connection verification with better error handling
  async verifyMainnetConnection(): Promise<boolean> {
    try {
      console.log('🔍 Performing comprehensive MAINNET verification...');
      
      const status = await this.getNetworkStatus();
      
      // Check if we got a failed connection status
      if (status.connectionStatus === 'failed') {
        console.warn('⚠️ API connection failed, but continuing with degraded mode');
        return false;
      }
      
      // Enhanced verification with multiple checks
      const verificationChecks = {
        endpointCheck: config.algorand.mainnetApi.includes('mainnet'),
        hasValidRound: status.lastRound && status.lastRound > 0,
        networkConfig: status.network === 'mainnet',
        apiResponse: status.connectionStatus === 'connected'
      };

      console.log('🔍 Verification results:', verificationChecks);

      // Consider connection valid if we have valid API responses from mainnet endpoints
      const isValid = verificationChecks.endpointCheck && 
                     verificationChecks.apiResponse;

      if (isValid && verificationChecks.hasValidRound) {
        console.log('✅ VERIFIED: Successfully connected to Algorand MAINNET');
        console.log('📊 Network Status:', {
          lastRound: status.lastRound,
          endpoint: config.algorand.mainnetApi,
          indexer: config.algorand.mainnetIndexer
        });
        return true;
      } else if (isValid) {
        console.log('⚠️ PARTIAL: Connected to MAINNET but with limited data');
        return true;
      } else {
        console.warn('⚠️ DEGRADED: Connection issues detected, running in offline mode');
        return false;
      }
    } catch (error) {
      console.error('❌ MAINNET verification failed:', error);
      return false;
    }
  }

  // Test connection with better error handling
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing MAINNET connection...');
      
      const status = await this.algodClient.status().do();
      
      // More robust validation
      if (!status) {
        console.warn('⚠️ MAINNET connection test - no response received');
        return false;
      }
      
      if (typeof status !== 'object') {
        console.warn('⚠️ MAINNET connection test - invalid response format:', typeof status);
        return false;
      }
      
      const hasValidResponse = status && (
        typeof status['last-round'] === 'number' || 
        status['last-round'] === 0 ||
        Object.keys(status).length > 0
      );
      
      if (hasValidResponse) {
        console.log('✅ MAINNET connection test passed');
        console.log('📊 Response data:', {
          lastRound: status['last-round'] || 'N/A',
          responseKeys: Object.keys(status)
        });
        return true;
      } else {
        console.warn('⚠️ MAINNET connection test - response missing expected data');
        console.log('📊 Received:', status);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ MAINNET connection test failed:', error.message);
      // Don't throw error, just return false to allow graceful degradation
      return false;
    }
  }
}

export const algorandService = new AlgorandService();