
import React, { useState, useEffect } from 'react';

interface AuthOverlayProps {
  onAuthenticate: (password: string, username: string) => Promise<{ success: boolean; isNewUser: boolean; needsPasswordSetup: boolean }> | { success: boolean; isNewUser: boolean; needsPasswordSetup: boolean };
  checkUserStatus: (username: string) => 'LOGIN' | 'SETUP';
  userCount: number;
  hasUsers?: boolean; // Server flag
  onCancel?: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ onAuthenticate, checkUserStatus, userCount, hasUsers, onCancel }) => {
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [buttonText, setButtonText] = useState('登录');

  useEffect(() => {
    // It is first run ONLY if no users locally AND server confirms no users
    const isFirstRun = userCount === 0 && !hasUsers;

    if (isFirstRun) {
      setButtonText('注册管理员账户');
    } else {
      const status = checkUserStatus(username);
      if (status === 'SETUP') {
        setButtonText('设置密码并登录');
      } else {
        setButtonText('登录');
      }
    }
  }, [username, checkUserStatus, userCount, hasUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim()) {
      setErrorMsg('请输入用户名');
      return;
    }

    try {
      const result = await onAuthenticate(password, username);

      if (result.success) {
        // Auth successful, parent handles state update
      } else {
        const isFirstRun = userCount === 0 && !hasUsers;

        if (result.isNewUser && !isFirstRun) {
          setErrorMsg('用户不存在');
        } else if (result.needsPasswordSetup || isFirstRun) {
          if (password.length < 4) setErrorMsg('新密码至少需要4位');
          else setErrorMsg('未知错误');
        } else {
          setErrorMsg('密码错误');
        }
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('验证出错');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
      <div className="bg-[#F5F5F7] w-full max-w-[360px] rounded-[18px] shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">

        <h1 className="text-[22px] font-bold text-[#1d1d1f] mb-8 text-left tracking-tight">
          {(userCount === 0 && !hasUsers) ? '欢迎使用 NexusHub' : (buttonText.includes('设置') ? '设置密码' : '登录')}
        </h1>

        {(userCount === 0 && !hasUsers) && (
          <p className="text-sm text-gray-500 mb-6">这是首次运行。请设置管理员账号和密码。</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrorMsg('');
              }}
              placeholder="用户名"
              className="w-full bg-white border border-gray-200 rounded-[12px] px-4 py-3.5 text-[15px] text-gray-800 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all placeholder:text-gray-400 shadow-sm"
              autoComplete="username"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMsg('');
              }}
              placeholder={(userCount === 0 && !hasUsers) ? "设置管理员密码" : (buttonText.includes('设置') ? "设置新密码" : "密码")}
              className={`
                 w-full bg-white border rounded-[12px] px-4 py-3.5 text-[15px] text-gray-800 outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-all placeholder:text-gray-400 shadow-sm
                 ${errorMsg ? 'border-red-500 text-red-600 ring-1 ring-red-500' : 'border-gray-200'}
               `}
              autoComplete="current-password"
            />
          </div>

          {errorMsg && (
            <p className="text-[#FF3B30] text-[13px] font-medium ml-1 animate-in slide-in-from-left-1">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white font-medium text-[15px] py-3.5 rounded-[12px] mt-2 transition-colors shadow-sm active:scale-[0.98]"
          >
            {buttonText}
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full bg-transparent hover:bg-gray-200/50 text-gray-500 font-medium text-[14px] py-2.5 rounded-[12px] mt-2 transition-colors"
            >
              暂不登录
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
