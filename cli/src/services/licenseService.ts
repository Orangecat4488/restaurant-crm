import { StorageService } from './storage';
import { ApiClient } from './api';
import { CliCrypto } from '../utils/crypto';
import { Logger } from '../utils/logger';

export class LicenseService {
  private storage: StorageService;
  private api: ApiClient;

  constructor(customConfigPath?: string, customApiUrl?: string) {
    this.storage = new StorageService(customConfigPath);
    const config = this.storage.load();
    if (customApiUrl) {
      config.apiUrl = customApiUrl;
    }
    this.api = new ApiClient(config);
  }

  async activate(key: string) {
    const formattedKey = key.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/i.test(formattedKey)) {
      throw new Error('Invalid license key format. Expected format: XXXX-XXXX-XXXX-XXXX');
    }

    const deviceFingerprint = CliCrypto.getDeviceFingerprint();
    const result = await this.api.activateLicense(formattedKey, deviceFingerprint);

    const config = this.storage.load();
    config.licenseKey = formattedKey;
    config.deviceId = deviceFingerprint;
    config.plan = result.plan;
    config.expiresAt = result.expiresAt;
    config.lastValidated = new Date().toISOString();
    this.storage.save(config);

    return result;
  }

  async getStatus() {
    const config = this.storage.load();
    if (!config.licenseKey) {
      throw new Error('No license key activated on this machine. Use: crm-license activate <KEY>');
    }

    const valResult = await this.api.validateLicense(config.licenseKey);
    const expiresDate = valResult.expiresAt ? new Date(valResult.expiresAt) : null;
    const now = new Date();
    const daysLeft = expiresDate ? Math.max(0, Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    // Refresh stored config
    config.lastValidated = new Date().toISOString();
    if (valResult.plan) config.plan = valResult.plan.name;
    if (valResult.expiresAt) config.expiresAt = valResult.expiresAt;
    this.storage.save(config);

    return {
      key: config.licenseKey,
      plan: valResult.plan?.name || config.plan || 'Standard',
      status: valResult.valid ? 'Active ✅' : 'Invalid / Expired ❌',
      expires: expiresDate ? expiresDate.toISOString().split('T')[0] : 'N/A',
      daysLeft,
      activations: `${valResult.activations || 1}/${valResult.maxActivations || 5}`,
      lastValidated: new Date(config.lastValidated).toLocaleString()
    };
  }

  async renew() {
    const config = this.storage.load();
    if (!config.licenseKey) {
      throw new Error('No license configured to renew.');
    }

    // Get current details to find subscription ID
    const details = await this.api.getLicense(config.licenseKey);
    if (!details.subscription?.id) {
      throw new Error('No active subscription ID found for this license key.');
    }

    const result = await this.api.renewSubscription(details.subscription.id);
    config.expiresAt = result.expiresAt;
    config.lastValidated = new Date().toISOString();
    this.storage.save(config);

    return result;
  }

  async deactivate() {
    const config = this.storage.load();
    if (!config.licenseKey) {
      throw new Error('No license key is currently active.');
    }

    const deviceFingerprint = config.deviceId || CliCrypto.getDeviceFingerprint();

    try {
      // Tell the server to release the activation slot
      const result = await this.api.deactivateLicense(config.licenseKey, deviceFingerprint);
      this.storage.clear();
      return { ...result, locallyCleared: true };
    } catch (err: any) {
      // If the network call fails, still clear local state so the operator
      // isn't stuck, but warn them.
      this.storage.clear();
      return {
        success: true,
        message: `Local credentials cleared. Could not contact server: ${err.message}`,
        locallyCleared: true
      };
    }
  }

  async getInfo() {
    const config = this.storage.load();
    if (!config.licenseKey) {
      throw new Error('No license key found.');
    }

    const details = await this.api.getLicense(config.licenseKey);
    return {
      key: config.licenseKey,
      companyName: details.client?.company_name || 'Individual Customer',
      email: details.client?.userEmail || details.client?.email || 'N/A',
      plan: details.plan?.name || 'Professional',
      created: details.created_at ? new Date(details.created_at).toISOString().split('T')[0] : 'N/A',
      expires: details.subscription?.expires_at ? new Date(details.subscription.expires_at).toISOString().split('T')[0] : 'N/A',
      autoRenew: details.subscription?.auto_renew ? 'Yes ✅' : 'No ❌',
      activations: `${details.activation_count || 1}/${details.max_activations || 5}`
    };
  }

  async login(email: string, pass: string) {
    const res = await this.api.login(email, pass);
    const config = this.storage.load();
    config.token = res.accessToken;
    this.storage.save(config);
    return res;
  }

  async logout() {
    const config = this.storage.load();
    delete config.token;
    this.storage.save(config);
  }
}
