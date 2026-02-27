'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { SuperAdminGuard } from '@/components/SuperAdminGuard';
import { TopNav } from '@/components/TopNav';
import {
  UserCog, Shield, ShieldAlert, Lock, Unlock, LogOut, KeyRound,
  Trash2, ChevronDown, ChevronUp, Search, Edit3, Check, X, Save,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-[#FBE4E4] text-[#E03E3E] border-[#E03E3E]/20',
  admin: 'bg-[#DDEBF1] text-[#0B6E99] border-[#0B6E99]/20',
  official: 'bg-[#FAEBDD] text-[#D9730D] border-[#D9730D]/20',
  athlete: 'bg-[#DDEDEA] text-[#0F7B6C] border-[#0F7B6C]/20',
};

const VALID_ROLES = ['super_admin', 'admin', 'official', 'athlete'];

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string | null;
  forcePasswordChange: boolean;
  activeSessions: number;
  lastActive: string;
  isLocked: boolean;
  accountLockout: {
    failedAttempts: number;
    lockoutUntil: string | null;
    escalationLevel: number;
  } | null;
}

export default function AccountManagement() {
  const { data: users, mutate, isLoading } = useSWR<UserAccount[]>('/api/super-admin/accounts', fetcher);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [editingField, setEditingField] = useState<{ userId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const filteredUsers = users?.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const performAction = async (userId: string, action: string, value?: string) => {
    setActionMessage('');
    const res = await fetch('/api/super-admin/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, value }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMessage(data.message);
      mutate();
    } else {
      setActionMessage(`Error: ${data.error}`);
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Permanently delete user "${name}"? This cannot be undone.`)) return;
    setActionMessage('');
    const res = await fetch('/api/super-admin/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMessage(data.message);
      mutate();
    } else {
      setActionMessage(`Error: ${data.error}`);
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const startEditing = (userId: string, field: string, currentValue: string) => {
    setEditingField({ userId, field });
    setEditValue(currentValue);
  };

  const saveEdit = async (userId: string, field: string) => {
    const action = field === 'name' ? 'changeName' : 'changeEmail';
    await performAction(userId, action, editValue);
    setEditingField(null);
    setEditValue('');
  };

  return (
    <SuperAdminGuard>
      <TopNav
        breadcrumbs={[
          { label: 'Super Admin', href: '/super-admin/dashboard' },
          { label: 'Accounts' },
        ]}
      />
      <div className="max-w-[1100px] mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-[4px] bg-[#D9730D] flex items-center justify-center">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-[28px] md:text-[40px] font-bold text-[#37352F] tracking-tight leading-tight">Accounts</h1>
            <p className="text-sm text-[#787774]">{users?.length || 0} total accounts</p>
          </div>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className={`px-4 py-2 rounded-[4px] text-sm font-medium mb-6 ${
            actionMessage.startsWith('Error') ? 'bg-[#FBE4E4] text-[#E03E3E]' : 'bg-[#DDEDEA] text-[#0F7B6C]'
          }`}>
            {actionMessage}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9B9A97]" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#E9E9E7] rounded-[3px] bg-white text-[#37352F] placeholder:text-[#9B9A97] focus:outline-none focus:border-[#0B6E99] transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {['all', ...VALID_ROLES].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[3px] border transition-colors capitalize ${
                  roleFilter === role
                    ? 'border-[#0B6E99] text-[#0B6E99] bg-[#DDEBF1]'
                    : 'border-[#E9E9E7] text-[#787774] hover:bg-[#F7F6F3]'
                }`}
              >
                {role === 'all' ? 'All' : role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-[#F7F6F3] rounded-[4px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map(user => {
              const isExpanded = expandedUser === user.id;
              return (
                <div key={user.id} className="bg-white border border-[#E9E9E7] rounded-[4px] overflow-hidden">
                  {/* Main row */}
                  <div
                    className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-[#FBFBFA] transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                      user.role === 'super_admin' ? 'bg-[#E03E3E]' :
                      user.role === 'admin' ? 'bg-[#0B6E99]' :
                      user.role === 'official' ? 'bg-[#D9730D]' : 'bg-[#0F7B6C]'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name & Email */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#37352F] truncate">{user.name}</div>
                      <div className="text-xs text-[#9B9A97] truncate">{user.email}</div>
                    </div>

                    {/* Role badge */}
                    <span className={`px-2.5 py-0.5 rounded-sm text-[11px] font-medium border ${ROLE_STYLES[user.role] || 'bg-[#F7F6F3] text-[#787774]'}`}>
                      {user.role.replace('_', ' ')}
                    </span>

                    {/* Status indicators */}
                    <div className="flex items-center gap-2">
                      {user.isLocked && (
                        <span className="flex items-center gap-1 text-xs text-[#E03E3E]">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {user.activeSessions > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[#0F7B6C]">
                          <div className="w-2 h-2 rounded-full bg-[#0F7B6C] animate-pulse" />
                          {user.activeSessions} session{user.activeSessions > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Expand icon */}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9B9A97]" /> : <ChevronDown className="w-4 h-4 text-[#9B9A97]" />}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-[#E9E9E7] bg-[#F7F6F3] px-4 py-4 space-y-4">
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoField label="User ID" value={user.id} />
                        <InfoField label="Created" value={new Date(user.createdAt).toLocaleDateString()} />
                        <InfoField label="Last Active" value={new Date(user.lastActive).toLocaleString()} />
                        <InfoField
                          label="Password Changed"
                          value={user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}
                        />
                      </div>

                      {/* Editable Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-[#9B9A97] w-12">Name</label>
                          {editingField?.userId === user.id && editingField?.field === 'name' ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 px-2 py-1 border border-[#E9E9E7] rounded-[3px] text-sm text-[#37352F] focus:outline-none focus:border-[#0B6E99]"
                                onClick={e => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); saveEdit(user.id, 'name'); }}
                                className="p-1 text-[#0F7B6C] hover:bg-[#DDEDEA] rounded-[3px]">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingField(null); }}
                                className="p-1 text-[#E03E3E] hover:bg-[#FBE4E4] rounded-[3px]">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-sm text-[#37352F]">{user.name}</span>
                              <button onClick={(e) => { e.stopPropagation(); startEditing(user.id, 'name', user.name); }}
                                className="p-1 text-[#9B9A97] hover:text-[#0B6E99] hover:bg-[#DDEBF1] rounded-[3px]">
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-[#9B9A97] w-12">Email</label>
                          {editingField?.userId === user.id && editingField?.field === 'email' ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="email"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 px-2 py-1 border border-[#E9E9E7] rounded-[3px] text-sm text-[#37352F] focus:outline-none focus:border-[#0B6E99]"
                                onClick={e => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); saveEdit(user.id, 'email'); }}
                                className="p-1 text-[#0F7B6C] hover:bg-[#DDEDEA] rounded-[3px]">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingField(null); }}
                                className="p-1 text-[#E03E3E] hover:bg-[#FBE4E4] rounded-[3px]">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-sm text-[#37352F]">{user.email}</span>
                              <button onClick={(e) => { e.stopPropagation(); startEditing(user.id, 'email', user.email); }}
                                className="p-1 text-[#9B9A97] hover:text-[#0B6E99] hover:bg-[#DDEBF1] rounded-[3px]">
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-[#9B9A97]">Role</label>
                        <div className="flex gap-1.5">
                          {VALID_ROLES.map(role => (
                            <button
                              key={role}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (user.role !== role) {
                                  if (confirm(`Change ${user.name}'s role to "${role.replace('_', ' ')}"?`)) {
                                    performAction(user.id, 'changeRole', role);
                                  }
                                }
                              }}
                              className={`px-2.5 py-1 rounded-[3px] text-xs font-medium capitalize transition-colors border ${
                                user.role === role
                                  ? ROLE_STYLES[role]
                                  : 'bg-white text-[#787774] border-[#E9E9E7] hover:bg-[#FBFBFA]'
                              }`}
                            >
                              {role.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lockout Info */}
                      {user.accountLockout && (
                        <div className="bg-[#FBF3DB] border border-[#DFAB01]/20 rounded-[4px] p-3">
                          <div className="text-xs font-medium text-[#D9730D] mb-1">Lockout Status</div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-[#787774]">
                            <span>Failed: {user.accountLockout.failedAttempts}</span>
                            <span>Level: {user.accountLockout.escalationLevel}</span>
                            <span>Until: {user.accountLockout.lockoutUntil ? new Date(user.accountLockout.lockoutUntil).toLocaleString() : 'Not locked'}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E9E9E7]">
                        <ActionButton
                          icon={<KeyRound className="w-3.5 h-3.5" />}
                          label="Force Password Change"
                          onClick={() => performAction(user.id, 'forcePasswordChange')}
                          color="text-[#D9730D] hover:bg-[#FAEBDD]"
                        />
                        {user.isLocked ? (
                          <ActionButton
                            icon={<Unlock className="w-3.5 h-3.5" />}
                            label="Unlock Account"
                            onClick={() => performAction(user.id, 'unlock')}
                            color="text-[#0F7B6C] hover:bg-[#DDEDEA]"
                          />
                        ) : (
                          <ActionButton
                            icon={<Lock className="w-3.5 h-3.5" />}
                            label="Disable Account"
                            onClick={() => {
                              if (confirm(`Disable ${user.name}'s account?`)) {
                                performAction(user.id, 'toggleActive', 'disable');
                              }
                            }}
                            color="text-[#D9730D] hover:bg-[#FAEBDD]"
                          />
                        )}
                        <ActionButton
                          icon={<LogOut className="w-3.5 h-3.5" />}
                          label="Terminate Sessions"
                          onClick={() => {
                            if (confirm(`Terminate all sessions for ${user.name}?`)) {
                              performAction(user.id, 'terminateSessions');
                            }
                          }}
                          color="text-[#0B6E99] hover:bg-[#DDEBF1]"
                        />
                        <ActionButton
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          label="Delete Account"
                          onClick={() => deleteUser(user.id, user.name)}
                          color="text-[#E03E3E] hover:bg-[#FBE4E4]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-[#9B9A97] border border-[#E9E9E7] rounded-[4px]">
                {search || roleFilter !== 'all' ? 'No accounts match your filters' : 'No accounts found'}
              </div>
            )}
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium text-[#9B9A97] uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-sm text-[#37352F] font-mono truncate">{value}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] text-xs font-medium border border-[#E9E9E7] transition-colors ${color}`}
    >
      {icon}
      {label}
    </button>
  );
}
