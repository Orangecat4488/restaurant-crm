import { useLicenseContext } from '../context/LicenseContext';
import { licenseService } from '../services/licenseService';

export const useLicense = () => {
  const context = useLicenseContext();

  const validate = async (key: string) => {
    return licenseService.validate(key);
  };

  const activate = async (key: string, deviceFingerprint: string) => {
    return licenseService.activate(key, deviceFingerprint);
  };

  const generate = async (params: any) => {
    const res = await licenseService.generate(params);
    await context.fetchLicenses();
    return res;
  };

  const revoke = async (id: string) => {
    const res = await licenseService.revoke(id);
    await context.fetchLicenses();
    return res;
  };

  return {
    ...context,
    validate,
    activate,
    generate,
    revoke
  };
};
