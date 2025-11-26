
// 简单哈希函数(用于 HTTP 环境或不支持 crypto.subtle 的环境)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// SHA-256 哈希函数
async function sha256Hash(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    // 如果 SHA-256 失败，回退到 simpleHash
    return simpleHash(message);
  }
}

// 检测哈希类型
function detectHashType(hash: string): 'sha256' | 'simple' {
  // SHA-256 固定 64 位，simpleHash 最多 8 位
  return hash.length === 64 ? 'sha256' : 'simple';
}

// 统一哈希接口 - 创建密码时使用
export async function hashPassword(message: string): Promise<string> {
  // 优先使用 SHA-256（更安全）
  if (crypto && crypto.subtle) {
    try {
      return await sha256Hash(message);
    } catch (e) {
      console.warn('SHA-256 not available, using simpleHash');
      return simpleHash(message);
    }
  }

  // 回退到 simpleHash
  return simpleHash(message);
}

// 验证密码 - 支持两种哈希算法
export async function verifyPassword(
  inputPassword: string,
  storedHash: string
): Promise<boolean> {
  const hashType = detectHashType(storedHash);

  if (hashType === 'simple') {
    // 存储的是 simpleHash，直接比较
    return simpleHash(inputPassword) === storedHash;
  } else {
    // 存储的是 SHA-256
    // 尝试 SHA-256 验证
    if (crypto && crypto.subtle) {
      try {
        const inputHash = await sha256Hash(inputPassword);
        return inputHash === storedHash;
      } catch (e) {
        // SHA-256 失败，尝试 simpleHash（不太可能，但作为兜底）
        return simpleHash(inputPassword) === storedHash;
      }
    }

    // crypto.subtle 不可用但存储的是 SHA-256
    // 这种情况下只能用 simpleHash 尝试（通常会失败）
    return simpleHash(inputPassword) === storedHash;
  }
}