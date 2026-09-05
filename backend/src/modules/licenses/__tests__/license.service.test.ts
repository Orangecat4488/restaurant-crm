import { LicensesService } from '../licenses.service';
import { CryptoUtil } from '../../../utils/crypto';
import { db } from '../../../database/data-source';

describe('LicensesService', () => {
  let service: LicensesService;

  beforeAll(async () => {
    await db.initialize();
  });

  beforeEach(() => {
    service = new LicensesService();
  });

  it('should generate valid license key format XXXX-XXXX-XXXX-XXXX', () => {
    const key = CryptoUtil.generateLicenseKey();
    expect(key).toMatch(/^[A-F0-9]{4}(-[A-F0-9]{4}){3}$/);
  });

  it('should validate format of license keys properly', () => {
    expect(CryptoUtil.validateLicenseKeyFormat('A1B2-C3D4-E5F6-G7H8')).toBe(true);
    expect(CryptoUtil.validateLicenseKeyFormat('invalid-key')).toBe(false);
    expect(CryptoUtil.validateLicenseKeyFormat('1234-5678')).toBe(false);
  });

  it('should generate, activate, and validate license lifecycle', async () => {
    const license = await service.generateLicense({
      maxActivations: 3
    });

    expect(license.key).toBeDefined();
    expect(license.status).toBe('active');
    expect(license.activation_count).toBe(0);

    // Validate key
    const valResult = await service.validateLicense(license.key);
    expect(valResult.valid).toBe(true);

    // Activate key
    const actResult = await service.activateLicense(license.key, 'test-fingerprint-001', '127.0.0.1');
    expect(actResult.success).toBe(true);
    expect(actResult.activations).toBe('1/3');
  });

  it('should reject invalid license key format on validate', async () => {
    const result = await service.validateLicense('INVALID-KEY');
    expect(result.valid).toBe(false);
  });
});
