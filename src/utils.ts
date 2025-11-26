
// 简单的哈希函数(用于不支持 crypto.subtle 的环境)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export async function hashPassword(message: string): Promise<string> {
  // 检查 crypto.subtle 是否可用
  if (!crypto || !crypto.subtle) {
    if (import.meta.env.DEV) {
      console.warn('crypto.subtle not available, using fallback hash');
    }
    return simpleHash(message);
  }

  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('crypto.subtle.digest failed, using fallback hash:', error);
    }
    return simpleHash(message);
  }
}
