export const whatsappConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  encryptionKey: process.env.ENCRYPTION_KEY,
};
