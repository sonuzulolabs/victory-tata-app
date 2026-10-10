import { apiRequest } from '@/lib/api/client';

export type AccountDeletionCheckResult = {
  registered: boolean;
  verification_token?: string;
  message?: string;
};

export async function checkAccountDeletion(phone10: string): Promise<AccountDeletionCheckResult> {
  return apiRequest<AccountDeletionCheckResult>('/account-deletion/check', {
    method: 'POST',
    body: JSON.stringify({ phone: phone10 }),
  });
}

export async function completeAccountDeletion(
  verificationToken: string,
  idToken: string,
): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>('/account-deletion/complete', {
    method: 'POST',
    body: JSON.stringify({
      verification_token: verificationToken,
      id_token: idToken,
    }),
  });
}
