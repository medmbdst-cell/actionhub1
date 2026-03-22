/**
 * Client Resend pour l'envoi d'emails
 * Documentation: https://resend.com/docs/send-with-nodejs
 */

export interface EmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Envoie un email via Resend
 * Nécessite RESEND_API_KEY dans .env.local
 */
export async function sendEmail(params: EmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('RESEND_API_KEY non configurée');
    return {
      success: false,
      error: 'RESEND_API_KEY non configurée - emails désactivés',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: params.from || 'ActionHub <onboarding@resend.dev>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Erreur Resend:', errorData);
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error: any) {
    console.error('Erreur envoi email:', error);
    return {
      success: false,
      error: error.message || 'Erreur inconnue',
    };
  }
}

/**
 * Envoie des emails en batch (limite Resend: 100 emails/batch)
 */
export async function sendEmailBatch(emails: EmailParams[]): Promise<EmailResult[]> {
  const BATCH_SIZE = 100;
  const results: EmailResult[] = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);

    // Envoyer les emails en parallèle dans le batch
    const batchResults = await Promise.all(
      batch.map(email => sendEmail(email))
    );

    results.push(...batchResults);

    // Petit délai entre les batches pour éviter le rate limiting
    if (i + BATCH_SIZE < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
