import React from 'react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'Gabriel',
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const isDefaultStock = !avatarUrl || avatarUrl.includes('photo-1534528741775') || avatarUrl.includes('unsplash');
  const initial = (name || 'G').trim().charAt(0).toUpperCase() || 'G';

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs rounded-xl',
    md: 'w-12 h-12 text-sm rounded-2xl',
    lg: 'w-14 h-14 text-base rounded-2xl',
  }[size];

  if (!isDefaultStock && avatarUrl) {
    return (
      <div className={`overflow-hidden shrink-0 border border-white/[0.12] bg-[#121418] ${sizeClasses} ${className}`}>
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center font-bold font-mono text-white bg-gradient-to-br from-[#1E2530] via-[#12151B] to-[#0A0C10] border border-emerald-500/30 shadow-inner ${sizeClasses} ${className}`}
    >
      <span className="tracking-wide text-emerald-400">{initial}</span>
    </div>
  );
};
